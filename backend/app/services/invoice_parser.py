from __future__ import annotations

import re
from dataclasses import dataclass

from app.schemas.approval import ExtractedLineItem
from app.utils.text_utils import lines, to_float


@dataclass
class ParsedInvoice:
    line_items: list[ExtractedLineItem]
    subtotal: float | None
    tax: float | None
    fees: float | None
    grand_total: float | None
    invoice_number: str | None
    invoice_date: str | None
    vendor_name: str | None


class InvoiceParser:
    MONEY_REGEX = re.compile(r"\$?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)")
    DATE_REGEX = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b")
    STRICT_ITEM_REGEX = re.compile(
        r"^(?P<description>.+?)\s+(?P<quantity>\d+(?:\.\d+)?)\s+(?P<unit_price>\$?[0-9]+(?:,[0-9]{3})*(?:\.\d{1,2})?)\s+(?P<line_total>\$?[0-9]+(?:,[0-9]{3})*(?:\.\d{1,2})?)$"
    )

    NOISE_PATTERNS = [
        re.compile(pattern, re.IGNORECASE)
        for pattern in [
            r"phone",
            r"fax",
            r"a/r",
            r"email",
            r"www\.",
            r"@",
            r"page\s+\d+\s+of\s+\d+",
            r"\b\d+\s+of\s+\d+\b",
            r"invoice\s*#",
            r"invoice\s+number",
            r"date:",
            r"customer",
            r"bill\s+to",
            r"ship\s+to",
            r"remit",
            r"po\s*box",
        ]
    ]

    def parse(self, text: str) -> ParsedInvoice:
        raw_lines = lines(text)
        line_items: list[ExtractedLineItem] = []
        subtotal = tax = fees = grand_total = None
        invoice_number = invoice_date = vendor_name = None

        for index, line in enumerate(raw_lines[:12]):
            lower = line.lower()
            if index == 0 and len(line.split()) <= 8:
                vendor_name = line
            if "invoice" in lower and not invoice_number:
                possible_number = self._extract_after_keywords(line, ["invoice #", "invoice no", "invoice number", "invoice"])
                invoice_number = possible_number or invoice_number
            if not invoice_date:
                date_match = self.DATE_REGEX.search(line)
                if date_match:
                    invoice_date = date_match.group(1)

        for line in raw_lines:
            lower = line.lower()
            values = [to_float(match) for match in self.MONEY_REGEX.findall(line)]
            values = [value for value in values if value is not None]

            if any(key in lower for key in ["subtotal", "sub total"]):
                subtotal = values[-1] if values else subtotal
                continue
            if "tax" in lower:
                tax = values[-1] if values else tax
                continue
            if any(key in lower for key in ["fee", "freight", "delivery", "misc charge", "surcharge"]):
                if self._looks_like_summary_line(lower):
                    fees = values[-1] if values else fees
                    continue
            if any(key in lower for key in ["total due", "grand total", "balance due", "amount due", "invoice total", "total"]):
                if values:
                    grand_total = values[-1]
                continue

            item = self._parse_line_item(line)
            if item:
                line_items.append(item)

        return ParsedInvoice(
            line_items=line_items,
            subtotal=subtotal,
            tax=tax,
            fees=fees,
            grand_total=grand_total,
            invoice_number=invoice_number,
            invoice_date=invoice_date,
            vendor_name=vendor_name,
        )

    def _parse_line_item(self, line: str) -> ExtractedLineItem | None:
        cleaned = re.sub(r"\s+", " ", line).strip()
        if not cleaned or len(cleaned) < 6:
            return None

        lowered = cleaned.lower()
        if self._looks_like_noise(cleaned, lowered):
            return None

        match = self.STRICT_ITEM_REGEX.match(cleaned)
        if not match:
            return None

        description = match.group("description").strip(" -|")
        quantity = to_float(match.group("quantity"))
        unit_price = to_float(match.group("unit_price"))
        line_total = to_float(match.group("line_total"))

        if quantity is None or unit_price is None or line_total is None:
            return None
        if quantity <= 0 or unit_price < 0 or line_total < 0:
            return None
        if not re.search(r"[A-Za-z]", description):
            return None
        if self._has_too_many_number_clusters(description):
            return None

        return ExtractedLineItem(
            description=description[:160],
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total,
            raw_line=line,
        )

    def _extract_after_keywords(self, line: str, keywords: list[str]) -> str | None:
        lower = line.lower()
        for keyword in keywords:
            if keyword in lower:
                idx = lower.index(keyword) + len(keyword)
                candidate = line[idx:].strip(" :#-")
                if candidate:
                    return candidate[:80]
        return None

    def _looks_like_noise(self, line: str, lowered: str) -> bool:
        if any(pattern.search(line) for pattern in self.NOISE_PATTERNS):
            return True
        if any(keyword in lowered for keyword in ["subtotal", "tax", "grand total", "amount due", "balance due"]):
            return True
        if "/" in line or "(" in line or ")" in line:
            return True
        if re.search(r"\b(?:ny|nj|ct|pa)\b", lowered) and len(re.findall(r"\d+", line)) >= 3:
            return True
        return False

    def _has_too_many_number_clusters(self, text: str) -> bool:
        return len(re.findall(r"\d+", text)) > 1

    def _looks_like_summary_line(self, lowered: str) -> bool:
        return any(keyword in lowered for keyword in ["fee", "freight", "delivery charge", "misc charge", "service fee"]) and not re.search(
            r"\b\d+(?:\.\d+)?\s+\$?[0-9]", lowered
        )