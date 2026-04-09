from __future__ import annotations

from rapidfuzz import fuzz

from app.schemas.approval import ExtractedLineItem, StageResult
from app.services.llm_service import LLMService
from app.services.pricing_parser import PricingRule
from app.utils.text_utils import clean_token


class PricingChecker:
    def __init__(self) -> None:
        self.llm_service = LLMService()

    def check(self, invoice_lines: list[ExtractedLineItem], pricing_rules: list[PricingRule]) -> StageResult:
        if not pricing_rules:
            return StageResult(
                name="Pricing Breakdown Check",
                status="Requires Human Review",
                confidence=0.3,
                summary="No pricing breakdown document was uploaded for comparison.",
                explanation="This stage cannot be safely approved without company pricing support.",
                issues_found=[],
                warnings=["Pricing comparison was skipped because no pricing breakdown was provided."],
                extracted_data={"matches": [], "mismatches": [], "unclear": []},
                llm_used=False,
            )

        matches: list[dict] = []
        mismatches: list[dict] = []
        unclear: list[dict] = []
        llm_used = False

        for invoice_item in invoice_lines:
            if invoice_item.unit_price is None:
                unclear.append(
                    {
                        "invoice_item": invoice_item.description,
                        "reason": "Unit price could not be parsed from the invoice line.",
                    }
                )
                continue

            normalized_invoice = clean_token(invoice_item.description)
            best_score = 0
            best_rule: PricingRule | None = None
            for rule in pricing_rules:
                score = fuzz.token_set_ratio(normalized_invoice, clean_token(rule.description))
                if score > best_score:
                    best_score = score
                    best_rule = rule

            if best_rule and best_score >= 84:
                if abs(invoice_item.unit_price - best_rule.unit_rate) <= 0.01:
                    matches.append(
                        {
                            "invoice_item": invoice_item.description,
                            "invoice_unit_price": invoice_item.unit_price,
                            "pricing_rule": best_rule.description,
                            "expected_rate": best_rule.unit_rate,
                            "score": best_score,
                        }
                    )
                else:
                    mismatches.append(
                        {
                            "invoice_item": invoice_item.description,
                            "invoice_unit_price": invoice_item.unit_price,
                            "pricing_rule": best_rule.description,
                            "expected_rate": best_rule.unit_rate,
                            "score": best_score,
                        }
                    )
            elif best_rule and 68 <= best_score < 84:
                used, interpretation = self.llm_service.explain_ambiguity(
                    "Determine whether an invoice line item likely maps to a pricing rule.",
                    {
                        "invoice_item": invoice_item.model_dump(),
                        "candidate_rule": best_rule.__dict__,
                        "fuzzy_score": best_score,
                    },
                )
                llm_used = llm_used or used
                if interpretation and not interpretation.get("uncertain", True):
                    unclear.append(
                        {
                            "invoice_item": invoice_item.description,
                            "reason": interpretation.get("interpretation"),
                            "best_score": best_score,
                        }
                    )
                else:
                    unclear.append(
                        {
                            "invoice_item": invoice_item.description,
                            "reason": "Closest pricing rule was too ambiguous for safe automatic approval.",
                            "best_score": best_score,
                        }
                    )
            else:
                unclear.append(
                    {
                        "invoice_item": invoice_item.description,
                        "reason": "No strong pricing rule match was found.",
                        "best_score": best_score,
                    }
                )

        total = len(invoice_lines)
        mismatch_count = len(mismatches)
        match_count = len(matches)
        unclear_count = len(unclear)
        confidence = min(0.93, 0.32 + ((match_count / total) if total else 0) * 0.55)
        if unclear_count:
            confidence -= 0.08
        confidence = max(0.2, confidence)

        if total == 0:
            status = "Requires Human Review"
            summary = "No invoice line items were parsed for pricing comparison."
            explanation = "The system could not safely identify invoice lines to compare against pricing rules."
        elif mismatch_count > 0:
            status = "Not Approved"
            summary = "One or more invoice prices do not match the pricing breakdown."
            explanation = "At least one deterministically matched item had a price different from the expected company rate."
        elif match_count == total and unclear_count == 0:
            status = "Approved"
            summary = "All parsed invoice prices match the pricing breakdown."
            explanation = "Each invoice line with a recognized pricing rule matched the expected unit rate."
        elif match_count > 0:
            status = "Partially Approved"
            summary = "Some invoice prices matched the pricing breakdown, but others were unclear."
            explanation = "The system found valid pricing support for part of the invoice, but not for every line."
        else:
            status = "Requires Human Review"
            summary = "Pricing support was too ambiguous for automatic approval."
            explanation = "The pricing breakdown did not map cleanly enough to the invoice for a safe decision."

        return StageResult(
            name="Pricing Breakdown Check",
            status=status,
            confidence=round(confidence, 2),
            summary=summary,
            explanation=explanation,
            issues_found=[
                f"{item['invoice_item']}: expected {item['expected_rate']:.2f}, found {item['invoice_unit_price']:.2f}."
                for item in mismatches[:20]
            ],
            warnings=[item["reason"] for item in unclear[:20]],
            extracted_data={
                "matches": matches[:30],
                "mismatches": mismatches[:30],
                "unclear": unclear[:30],
            },
            llm_used=llm_used,
        )
