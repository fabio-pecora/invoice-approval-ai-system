from __future__ import annotations

from decimal import Decimal

from app.schemas.approval import StageResult
from app.services.invoice_parser import ParsedInvoice


class CalculationChecker:
    def check(self, parsed_invoice: ParsedInvoice) -> StageResult:
        issues: list[str] = []
        warnings: list[str] = []
        checked_count = 0
        passing_count = 0

        extracted_data = {
            "invoice_number": parsed_invoice.invoice_number,
            "invoice_date": parsed_invoice.invoice_date,
            "vendor_name": parsed_invoice.vendor_name,
            "line_items": [item.model_dump() for item in parsed_invoice.line_items[:25]],
            "subtotal": parsed_invoice.subtotal,
            "tax": parsed_invoice.tax,
            "fees": parsed_invoice.fees,
            "grand_total": parsed_invoice.grand_total,
        }

        for item in parsed_invoice.line_items:
            if item.quantity is None or item.unit_price is None or item.line_total is None:
                continue
            checked_count += 1
            expected = round(float(Decimal(str(item.quantity)) * Decimal(str(item.unit_price))), 2)
            actual = round(item.line_total, 2)
            if abs(expected - actual) <= 0.01:
                passing_count += 1
            else:
                issues.append(
                    f"Line item '{item.description}' appears inconsistent: {item.quantity} × {item.unit_price:.2f} = {expected:.2f}, but invoice shows {actual:.2f}."
                )

        computed_subtotal = round(sum((item.line_total or 0) for item in parsed_invoice.line_items), 2) if parsed_invoice.line_items else None
        if parsed_invoice.subtotal is not None and computed_subtotal is not None:
            checked_count += 1
            if abs(parsed_invoice.subtotal - computed_subtotal) <= 0.01:
                passing_count += 1
            else:
                issues.append(
                    f"Subtotal mismatch: parsed line items sum to {computed_subtotal:.2f}, but invoice subtotal shows {parsed_invoice.subtotal:.2f}."
                )
        elif parsed_invoice.subtotal is None:
            warnings.append("Subtotal could not be reliably found on the invoice.")

        if parsed_invoice.grand_total is not None:
            components_total = (parsed_invoice.subtotal or computed_subtotal or 0) + (parsed_invoice.tax or 0) + (parsed_invoice.fees or 0)
            checked_count += 1
            if abs(parsed_invoice.grand_total - round(components_total, 2)) <= 0.01:
                passing_count += 1
            else:
                issues.append(
                    f"Grand total mismatch: subtotal + tax + fees = {components_total:.2f}, but invoice total shows {parsed_invoice.grand_total:.2f}."
                )
        else:
            warnings.append("Grand total could not be reliably found on the invoice.")

        if checked_count == 0:
            return StageResult(
                name="Calculation Check",
                status="Requires Human Review",
                confidence=0.28,
                summary="The system could not reliably parse enough calculation fields to approve this stage.",
                explanation="No dependable quantity, unit price, subtotal, or total values were available for deterministic math checks.",
                issues_found=[],
                warnings=["Invoice structure was too ambiguous for safe automatic calculation approval."],
                extracted_data=extracted_data,
                llm_used=False,
            )

        pass_ratio = passing_count / checked_count if checked_count else 0
        confidence = min(0.95, 0.45 + (pass_ratio * 0.45) + (0.05 if checked_count >= 2 else 0))

        if issues:
            status = "Not Approved"
            summary = "The invoice contains one or more calculation inconsistencies."
            explanation = "Deterministic math checks found mismatches in line totals, subtotal, or grand total."
        elif warnings:
            status = "Partially Approved"
            summary = "The available calculations checked out, but some financial fields could not be confirmed."
            explanation = "All parsed math passed, but at least one supporting field was missing or unclear."
        else:
            status = "Approved"
            summary = "Invoice calculations appear consistent based on the parsed data."
            explanation = "Line totals and summary totals matched deterministic calculations within rounding tolerance."

        return StageResult(
            name="Calculation Check",
            status=status,
            confidence=round(confidence, 2),
            summary=summary,
            explanation=explanation,
            issues_found=issues,
            warnings=warnings,
            extracted_data=extracted_data,
            llm_used=False,
        )
