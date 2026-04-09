from __future__ import annotations

import re
from pathlib import Path

from app.schemas.approval import ApprovalResponse, ExtractedDocumentData, StageResult
from app.services.llm_service import LLMService
from app.services.pdf_extraction import PDFExtractionService


class ApprovalService:
    def __init__(self) -> None:
        self.pdf_extractor = PDFExtractionService()
        self.llm_service = LLMService()

    def run(
        self,
        invoice_path: Path,
        ticket_paths: list[Path],
        pricing_path: Path | None,
    ) -> ApprovalResponse:
        extraction_details: list[ExtractedDocumentData] = []

        invoice_text, invoice_details = self.pdf_extractor.extract_document(invoice_path, "Invoice")
        invoice_summary = self._extract_invoice_summary(invoice_text)

        invoice_details.key_fields = {
            "document_type": "invoice",
            "vendor_name": invoice_summary["vendor_name"],
            "invoice_date": invoice_summary["invoice_date"],
            "invoice_total": invoice_summary["invoice_total"],
            "has_text": bool(invoice_text.strip()),
        }
        extraction_details.append(invoice_details)

        ticket_documents: list[dict[str, str]] = []
        for ticket_path in ticket_paths:
            ticket_text, ticket_details = self.pdf_extractor.extract_document(ticket_path, ticket_path.name)
            ticket_details.key_fields = {
                "document_type": "ticket",
                "has_text": bool(ticket_text.strip()),
            }
            extraction_details.append(ticket_details)
            ticket_documents.append(
                {
                    "filename": ticket_path.name,
                    "text": ticket_text,
                }
            )

        pricing_document: dict[str, str] | None = None
        if pricing_path is not None:
            pricing_text, pricing_details = self.pdf_extractor.extract_document(
                pricing_path,
                pricing_path.name,
            )
            pricing_details.key_fields = {
                "document_type": "pricing_breakdown",
                "has_text": bool(pricing_text.strip()),
            }
            extraction_details.append(pricing_details)
            pricing_document = {
                "filename": pricing_path.name,
                "text": pricing_text,
            }

        llm_review = self.llm_service.review_invoice_documents(
            invoice_filename=invoice_path.name,
            invoice_text=invoice_text,
            ticket_documents=ticket_documents,
            pricing_document=pricing_document,
            extraction_details=[detail.model_dump() for detail in extraction_details],
        )

        stages = [StageResult(**stage) for stage in llm_review["stages"]]

        calculation_stage = next((stage for stage in stages if stage.name == "Calculation Check"), None)
        if calculation_stage is not None:
            calculation_totals = self._extract_calculation_totals(
                calculation_stage.extracted_data,
                invoice_summary["invoice_total"],
            )
            calculation_stage.extracted_data = {
                **calculation_stage.extracted_data,
                **calculation_totals,
            }

        return ApprovalResponse(
            overall_status=llm_review["overall_status"],
            overall_summary=llm_review["overall_summary"],
            overall_explanation=llm_review["overall_explanation"],
            invoice_filename=invoice_path.name,
            stages=stages,
            extraction_details=extraction_details,
        )

    def _extract_invoice_summary(self, invoice_text: str) -> dict[str, str]:
        cleaned = " ".join(invoice_text.split())

        vendor_name = self._extract_vendor_name(cleaned)
        invoice_date = self._extract_invoice_date(cleaned)
        invoice_total = self._extract_invoice_total(cleaned)

        return {
            "vendor_name": vendor_name,
            "invoice_date": invoice_date,
            "invoice_total": invoice_total,
        }

    def _extract_vendor_name(self, text: str) -> str:
        patterns = [
            r"from[_\s]+([A-Za-z0-9 .,&'\-]+?)(?:[_\s]|pdf)",
            r"([A-Z][A-Za-z0-9 .,&'\-]+(?:Corp|Corporation|Inc|LLC|Co|Company))",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                value = match.group(1).strip(" _.-")
                if value:
                    return value

        upper_match = re.search(
            r"([A-Z][A-Z0-9 .,&'\-]{5,}(?:CORP|CORPORATION|INC|LLC|CO|COMPANY))",
            text,
        )
        if upper_match:
            return upper_match.group(1).strip()

        return "Not found"

    def _extract_invoice_date(self, text: str) -> str:
        patterns = [
            r"\b(\d{1,2}/\d{1,2}/\d{2,4})\b",
            r"\b(\d{4}-\d{2}-\d{2})\b",
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)

        return "Not found"

    def _extract_invoice_total(self, text: str) -> str:
        total_patterns = [
            r"(?:invoice total|total amount|amount due|balance due|grand total)[^\d]{0,20}(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)",
            r"(?:invoice total|total amount|amount due|balance due|grand total)[^\d]{0,20}\$?(\d+(?:\.\d{2})?)",
        ]

        for pattern in total_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)

        money_values = re.findall(r"\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b", text)
        if money_values:
            def to_number(value: str) -> float:
                return float(value.replace(",", ""))

            return max(money_values, key=to_number)

        return "Not found"

    def _extract_calculation_totals(
        self,
        extracted_data: dict,
        invoice_total: str,
    ) -> dict[str, str]:
        possible_totals = extracted_data.get("possible_totals", [])
        notes = extracted_data.get("notes", [])

        ai_total = self._find_money_in_list(possible_totals)
        if ai_total == "Not found":
            ai_total = self._find_money_in_list(notes)

        return {
            "ai_calculated_total": ai_total,
            "invoice_total_found": invoice_total,
        }

    def _find_money_in_list(self, values: list) -> str:
        if not isinstance(values, list):
            return "Not found"

        for value in values:
            text = str(value)
            match = re.search(r"\b\d{1,3}(?:,\d{3})*(?:\.\d{2})\b", text)
            if match:
                return match.group(0)

        return "Not found"