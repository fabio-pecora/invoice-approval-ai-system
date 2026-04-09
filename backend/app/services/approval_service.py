from __future__ import annotations

from pathlib import Path

from app.schemas.approval import ApprovalResponse, ExtractedDocumentData
from app.services.calculation_checker import CalculationChecker
from app.services.confidence_service import ConfidenceService
from app.services.invoice_parser import InvoiceParser
from app.services.pdf_extraction import PDFExtractionService
from app.services.pricing_checker import PricingChecker
from app.services.pricing_parser import PricingParser
from app.services.ticket_matcher import TicketMatcher
from app.services.ticket_parser import TicketParser


class ApprovalService:
    def __init__(self) -> None:
        self.pdf_extractor = PDFExtractionService()
        self.invoice_parser = InvoiceParser()
        self.ticket_parser = TicketParser()
        self.pricing_parser = PricingParser()
        self.calculation_checker = CalculationChecker()
        self.ticket_matcher = TicketMatcher()
        self.pricing_checker = PricingChecker()
        self.confidence_service = ConfidenceService()

    def run(
        self,
        invoice_path: Path,
        ticket_paths: list[Path],
        pricing_path: Path | None,
    ) -> ApprovalResponse:
        extraction_details: list[ExtractedDocumentData] = []

        invoice_text, invoice_details = self.pdf_extractor.extract_document(invoice_path, "Invoice")
        extraction_details.append(invoice_details)
        parsed_invoice = self.invoice_parser.parse(invoice_text)
        invoice_details.key_fields = {
            "invoice_number": parsed_invoice.invoice_number,
            "invoice_date": parsed_invoice.invoice_date,
            "vendor_name": parsed_invoice.vendor_name,
            "line_item_count": len(parsed_invoice.line_items),
            "subtotal": parsed_invoice.subtotal,
            "grand_total": parsed_invoice.grand_total,
        }

        ticket_entries = []
        for ticket_path in ticket_paths:
            text, details = self.pdf_extractor.extract_document(ticket_path, ticket_path.name)
            entries = self.ticket_parser.parse(text)
            details.key_fields = {"entry_count": len(entries)}
            extraction_details.append(details)
            ticket_entries.extend(entries)

        pricing_rules = []
        if pricing_path is not None:
            pricing_text, pricing_details = self.pdf_extractor.extract_document(pricing_path, pricing_path.name)
            pricing_rules = self.pricing_parser.parse(pricing_text)
            pricing_details.key_fields = {"rule_count": len(pricing_rules)}
            extraction_details.append(pricing_details)

        calculation_stage = self.calculation_checker.check(parsed_invoice)
        ticket_stage = self.ticket_matcher.check(parsed_invoice.line_items, ticket_entries)
        pricing_stage = self.pricing_checker.check(parsed_invoice.line_items, pricing_rules)
        stages = [calculation_stage, ticket_stage, pricing_stage]

        overall_status, overall_summary, overall_explanation = self.confidence_service.overall(stages)

        return ApprovalResponse(
            overall_status=overall_status,
            overall_summary=overall_summary,
            overall_explanation=overall_explanation,
            invoice_filename=invoice_path.name,
            stages=stages,
            extraction_details=extraction_details,
        )
