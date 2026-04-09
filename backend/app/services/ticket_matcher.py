from __future__ import annotations

from rapidfuzz import fuzz

from app.schemas.approval import ExtractedLineItem, StageResult
from app.services.llm_service import LLMService
from app.services.ticket_parser import TicketEntry
from app.utils.text_utils import clean_token


class TicketMatcher:
    def __init__(self) -> None:
        self.llm_service = LLMService()

    def check(self, invoice_lines: list[ExtractedLineItem], ticket_entries: list[TicketEntry]) -> StageResult:
        if not ticket_entries:
            return StageResult(
                name="Ticket Match Check",
                status="Requires Human Review",
                confidence=0.3,
                summary="No ticket documents were uploaded for comparison.",
                explanation="This stage cannot be safely approved without ticket support documents.",
                issues_found=[],
                warnings=["Ticket comparison was skipped because no tickets were provided."],
                extracted_data={"matches": [], "missing": [], "extra_invoice_items": []},
                llm_used=False,
            )

        matches: list[dict] = []
        missing: list[dict] = []
        extra: list[dict] = []
        warnings: list[str] = []
        llm_used = False

        for invoice_item in invoice_lines:
            normalized_invoice = clean_token(invoice_item.description)
            best_score = 0
            best_match: TicketEntry | None = None

            for ticket_entry in ticket_entries:
                score = fuzz.token_set_ratio(normalized_invoice, clean_token(ticket_entry.description))
                if score > best_score:
                    best_score = score
                    best_match = ticket_entry

            quantity_aligned = True
            if best_match and invoice_item.quantity is not None and best_match.quantity is not None:
                quantity_aligned = abs(invoice_item.quantity - best_match.quantity) <= 0.01

            if best_match and best_score >= 82 and quantity_aligned:
                matches.append(
                    {
                        "invoice_item": invoice_item.description,
                        "ticket_item": best_match.description,
                        "score": best_score,
                        "quantity_match": quantity_aligned,
                    }
                )
            elif best_match and 65 <= best_score < 82:
                used, interpretation = self.llm_service.explain_ambiguity(
                    "Determine whether an invoice item likely matches a ticket item.",
                    {
                        "invoice_item": invoice_item.model_dump(),
                        "candidate_ticket": best_match.__dict__,
                        "fuzzy_score": best_score,
                    },
                )
                llm_used = llm_used or used
                if interpretation and not interpretation.get("uncertain", True):
                    warnings.append(
                        f"Possible ticket support for '{invoice_item.description}' required fallback interpretation."
                    )
                    matches.append(
                        {
                            "invoice_item": invoice_item.description,
                            "ticket_item": best_match.description,
                            "score": best_score,
                            "quantity_match": quantity_aligned,
                            "llm_note": interpretation.get("interpretation"),
                        }
                    )
                else:
                    missing.append(
                        {
                            "invoice_item": invoice_item.description,
                            "reason": "Closest ticket match was too ambiguous for safe approval.",
                            "best_score": best_score,
                        }
                    )
            else:
                missing.append(
                    {
                        "invoice_item": invoice_item.description,
                        "reason": "No strong ticket support was found.",
                        "best_score": best_score,
                    }
                )

        ticket_descriptions = {clean_token(entry.description) for entry in ticket_entries}
        for entry in ticket_entries:
            used = False
            normalized_ticket = clean_token(entry.description)
            for matched in matches:
                if clean_token(matched["ticket_item"]) == normalized_ticket:
                    used = True
                    break
            if not used and normalized_ticket in ticket_descriptions:
                extra.append({"ticket_item": entry.description, "note": "Ticket entry was not clearly billed on the invoice."})

        total_invoice_items = len(invoice_lines)
        matched_count = len(matches)
        coverage = (matched_count / total_invoice_items) if total_invoice_items else 0
        confidence = min(0.92, 0.3 + coverage * 0.55 + (0.05 if not warnings else 0))

        if total_invoice_items == 0:
            status = "Requires Human Review"
            summary = "No invoice line items were parsed for ticket comparison."
            explanation = "The system could not safely identify billable lines to compare against the tickets."
        elif matched_count == total_invoice_items and not warnings:
            status = "Approved"
            summary = "All parsed invoice items were supported by ticket documents."
            explanation = "Each invoice line had a strong ticket match with acceptable similarity and quantity alignment."
        elif matched_count > 0 and matched_count < total_invoice_items:
            status = "Partially Approved"
            summary = "Some invoice items were supported by tickets, but others were missing or unclear."
            explanation = "At least one invoice line matched tickets, but full support was not established for the whole invoice."
        elif warnings:
            status = "Requires Human Review"
            summary = "Ticket support may exist, but it was too ambiguous for automatic approval."
            explanation = "Fallback interpretation was needed, so a human should confirm the mapping."
        else:
            status = "Not Approved"
            summary = "The invoice is not adequately supported by the uploaded tickets."
            explanation = "No strong ticket matches were found for one or more billed items."

        return StageResult(
            name="Ticket Match Check",
            status=status,
            confidence=round(confidence, 2),
            summary=summary,
            explanation=explanation,
            issues_found=[item["reason"] if "reason" in item else item["note"] for item in missing[:20]],
            warnings=warnings,
            extracted_data={
                "matches": matches[:30],
                "missing": missing[:30],
                "extra_invoice_items": [],
                "unused_ticket_entries": extra[:30],
            },
            llm_used=llm_used,
        )
