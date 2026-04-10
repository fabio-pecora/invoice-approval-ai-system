from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from app.schemas.approval import StageResult
from app.services.ticket_parser import TicketParser


class TicketMatcher:
    def __init__(self) -> None:
        self.ticket_parser = TicketParser()

    def evaluate(
        self,
        invoice_line_items: list[Any],
        ticket_texts: list[str],
        llm_fallback_used: bool = False,
    ) -> StageResult:
        if not ticket_texts:
            return StageResult(
                stage_name="Ticket Match Check",
                status="Requires Human Review",
                explanation="No ticket documents were uploaded, so invoice support cannot be validated against delivery or service evidence.",
                confidence=30,
                llm_fallback_used=llm_fallback_used,
                issues_found=[],
                warnings=["Ticket comparison was skipped because no tickets were provided."],
                extracted_data={
                    "support_summary": {
                        "invoice_item_count": len(invoice_line_items),
                        "ticket_item_count": 0,
                        "matched_count": 0,
                        "uncertain_count": 0,
                        "unsupported_count": 0,
                    },
                    "matches": [],
                    "missing_from_tickets": [],
                    "extras_on_invoice": [],
                    "uncertain_matches": [],
                    "ticket_items": [],
                },
            )

        if not invoice_line_items:
            return StageResult(
                stage_name="Ticket Match Check",
                status="Requires Human Review",
                explanation="No invoice line items were parsed with enough confidence, so ticket matching cannot be evaluated safely.",
                confidence=35,
                llm_fallback_used=llm_fallback_used,
                issues_found=[],
                warnings=["Invoice item extraction was too weak for reliable ticket comparison."],
                extracted_data={
                    "support_summary": {
                        "invoice_item_count": 0,
                        "ticket_item_count": 0,
                        "matched_count": 0,
                        "uncertain_count": 0,
                        "unsupported_count": 0,
                    },
                    "matches": [],
                    "missing_from_tickets": [],
                    "extras_on_invoice": [],
                    "uncertain_matches": [],
                    "ticket_items": [],
                },
            )

        parsed_tickets = self.ticket_parser.parse_many(ticket_texts)

        ticket_items: list[dict[str, Any]] = []
        for ticket in parsed_tickets:
            for item in ticket.items:
                ticket_items.append(
                    {
                        "description": item.description,
                        "quantity": item.quantity,
                        "ticket_number": item.ticket_number,
                        "ticket_date": item.ticket_date,
                        "raw_line": item.raw_line,
                    }
                )

        if not ticket_items:
            return StageResult(
                stage_name="Ticket Match Check",
                status="Requires Human Review",
                explanation="Ticket files were uploaded, but no reliable ticket items could be extracted from them.",
                confidence=40,
                llm_fallback_used=llm_fallback_used,
                issues_found=[],
                warnings=["Ticket extraction did not produce enough structured evidence for safe matching."],
                extracted_data={
                    "support_summary": {
                        "invoice_item_count": len(invoice_line_items),
                        "ticket_item_count": 0,
                        "matched_count": 0,
                        "uncertain_count": 0,
                        "unsupported_count": 0,
                    },
                    "matches": [],
                    "missing_from_tickets": [],
                    "extras_on_invoice": [],
                    "uncertain_matches": [],
                    "ticket_items": [],
                },
            )

        matches: list[dict[str, Any]] = []
        missing_from_tickets: list[dict[str, Any]] = []
        extras_on_invoice: list[dict[str, Any]] = []
        uncertain_matches: list[dict[str, Any]] = []

        for invoice_item in invoice_line_items:
            invoice_description = self._safe_get(invoice_item, "description")
            invoice_quantity = self._safe_get(invoice_item, "quantity")

            best_ticket, best_score = self._find_best_match(invoice_description, ticket_items)

            if not best_ticket:
                record = {
                    "invoice_description": invoice_description,
                    "invoice_quantity": invoice_quantity,
                    "reason": "No ticket item was similar enough to support this invoice line.",
                }
                missing_from_tickets.append(record)
                extras_on_invoice.append(record)
                continue

            quantity_status = self._quantity_status(invoice_quantity, best_ticket.get("quantity"))

            result = {
                "invoice_description": invoice_description,
                "invoice_quantity": invoice_quantity,
                "matched_ticket_description": best_ticket.get("description"),
                "matched_ticket_quantity": best_ticket.get("quantity"),
                "ticket_number": best_ticket.get("ticket_number"),
                "ticket_date": best_ticket.get("ticket_date"),
                "similarity": round(best_score, 2),
                "quantity_status": quantity_status,
                "reason": self._build_reason(best_score, quantity_status),
            }

            if best_score >= 0.86 and quantity_status in {"ok", "unknown"}:
                matches.append(result)
            elif best_score >= 0.72:
                uncertain_matches.append(result)
            else:
                record = {
                    "invoice_description": invoice_description,
                    "invoice_quantity": invoice_quantity,
                    "matched_ticket_description": best_ticket.get("description"),
                    "matched_ticket_quantity": best_ticket.get("quantity"),
                    "similarity": round(best_score, 2),
                    "reason": "A weak or partial ticket match was found, but the support is not strong enough to approve safely.",
                }
                missing_from_tickets.append(record)
                extras_on_invoice.append(record)

        issues_found: list[str] = []
        warnings: list[str] = []

        if extras_on_invoice:
            issues_found.append(
                f"{len(extras_on_invoice)} invoice item(s) do not have strong ticket support."
            )

        if uncertain_matches:
            warnings.append(
                f"{len(uncertain_matches)} invoice item(s) have only partial or ambiguous ticket support."
            )

        match_count = len(matches)
        unsupported_count = len(extras_on_invoice)
        uncertain_count = len(uncertain_matches)
        invoice_count = len(invoice_line_items)

        status, confidence, explanation = self._finalize_status(
            invoice_count=invoice_count,
            match_count=match_count,
            unsupported_count=unsupported_count,
            uncertain_count=uncertain_count,
        )

        return StageResult(
            stage_name="Ticket Match Check",
            status=status,
            explanation=explanation,
            confidence=confidence,
            llm_fallback_used=llm_fallback_used,
            issues_found=issues_found,
            warnings=warnings,
            extracted_data={
                "support_summary": {
                    "invoice_item_count": invoice_count,
                    "ticket_item_count": len(ticket_items),
                    "matched_count": match_count,
                    "uncertain_count": uncertain_count,
                    "unsupported_count": unsupported_count,
                },
                "matches": matches,
                "missing_from_tickets": missing_from_tickets,
                "extras_on_invoice": extras_on_invoice,
                "uncertain_matches": uncertain_matches,
                "ticket_items": ticket_items[:25],
            },
        )

    def _find_best_match(
        self,
        invoice_description: str,
        ticket_items: list[dict[str, Any]],
    ) -> tuple[dict[str, Any] | None, float]:
        best_item = None
        best_score = 0.0

        normalized_invoice = self._normalize(invoice_description)
        invoice_tokens = self._token_set(normalized_invoice)

        for ticket_item in ticket_items:
            ticket_description = ticket_item.get("description", "")
            normalized_ticket = self._normalize(ticket_description)
            ticket_tokens = self._token_set(normalized_ticket)

            sequence_score = SequenceMatcher(None, normalized_invoice, normalized_ticket).ratio()
            overlap_score = self._token_overlap(invoice_tokens, ticket_tokens)

            final_score = (sequence_score * 0.65) + (overlap_score * 0.35)

            if final_score > best_score:
                best_score = final_score
                best_item = ticket_item

        return best_item, best_score

    def _quantity_status(
        self,
        invoice_quantity: Any,
        ticket_quantity: Any,
    ) -> str:
        try:
            if invoice_quantity is None or ticket_quantity is None:
                return "unknown"

            invoice_qty = float(invoice_quantity)
            ticket_qty = float(ticket_quantity)

            if abs(invoice_qty - ticket_qty) < 0.01:
                return "ok"

            if ticket_qty >= invoice_qty:
                return "ok"

            return "mismatch"
        except Exception:
            return "unknown"

    def _build_reason(self, similarity: float, quantity_status: str) -> str:
        if similarity >= 0.86 and quantity_status == "ok":
            return "The ticket item strongly supports the invoice line and the quantity appears consistent."
        if similarity >= 0.86 and quantity_status == "unknown":
            return "The ticket item strongly supports the invoice line, but quantity could not be verified from the ticket text."
        if similarity >= 0.72 and quantity_status == "mismatch":
            return "The description is reasonably close, but the quantity appears lower on the ticket than on the invoice."
        if similarity >= 0.72:
            return "A likely ticket match was found, but the support is not strong enough for automatic approval."
        return "Only a weak ticket match was found."

    def _finalize_status(
        self,
        invoice_count: int,
        match_count: int,
        unsupported_count: int,
        uncertain_count: int,
    ) -> tuple[str, int, str]:
        if invoice_count == 0:
            return (
                "Requires Human Review",
                35,
                "No invoice items were available for ticket validation.",
            )

        if unsupported_count == 0 and uncertain_count == 0 and match_count == invoice_count:
            return (
                "Approved",
                90,
                "All invoice line items have strong ticket support.",
            )

        if unsupported_count == 0 and uncertain_count > 0 and match_count + uncertain_count == invoice_count:
            return (
                "Partially Approved",
                72,
                "Most invoice items are supported by tickets, but some matches remain ambiguous and should be reviewed.",
            )

        if unsupported_count > 0 and match_count > 0:
            return (
                "Partially Approved",
                58,
                "Some invoice items are supported by tickets, but one or more items are missing strong ticket evidence.",
            )

        if unsupported_count == invoice_count:
            return (
                "Not Approved",
                42,
                "None of the invoice items had strong ticket support.",
            )

        return (
            "Requires Human Review",
            50,
            "Ticket support could not be determined with enough confidence for automatic approval.",
        )

    def _normalize(self, value: str) -> str:
        value = value.lower()
        value = re.sub(r"[^a-z0-9\s]", " ", value)
        value = re.sub(r"\s+", " ", value).strip()
        return value

    def _token_set(self, value: str) -> set[str]:
        stop_words = {
            "the",
            "and",
            "for",
            "with",
            "pack",
            "box",
            "unit",
            "pcs",
            "piece",
            "pieces",
            "ea",
            "of",
        }
        return {token for token in value.split() if token and token not in stop_words}

    def _token_overlap(self, left: set[str], right: set[str]) -> float:
        if not left or not right:
            return 0.0
        intersection = len(left & right)
        union = len(left | right)
        if union == 0:
            return 0.0
        return intersection / union

    def _safe_get(self, obj: Any, field_name: str) -> Any:
        if isinstance(obj, dict):
            return obj.get(field_name)
        return getattr(obj, field_name, None)