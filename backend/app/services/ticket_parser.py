from __future__ import annotations

import re
from dataclasses import dataclass

from app.utils.text_utils import lines, to_float


@dataclass
class TicketItem:
    description: str
    quantity: float | None
    ticket_number: str | None
    ticket_date: str | None
    raw_line: str


@dataclass
class ParsedTicket:
    ticket_number: str | None
    ticket_date: str | None
    items: list[TicketItem]
    raw_text: str


class TicketParser:
    DATE_REGEX = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", re.IGNORECASE)
    TICKET_NUMBER_REGEX = re.compile(
        r"(?:ticket|delivery ticket|slip|ticket #|ticket no\.?|ticket number)\s*[:#]?\s*([A-Za-z0-9\-\/]+)",
        re.IGNORECASE,
    )

    NOISE_PATTERNS = [
        re.compile(pattern, re.IGNORECASE)
        for pattern in [
            r"phone",
            r"fax",
            r"email",
            r"www\.",
            r"page\s+\d+\s+of\s+\d+",
            r"\b\d+\s+of\s+\d+\b",
            r"bill to",
            r"ship to",
            r"remit",
            r"address",
            r"customer",
            r"invoice",
            r"subtotal",
            r"tax",
            r"total",
            r"amount due",
            r"balance due",
        ]
    ]

    ITEM_WITH_QTY_REGEXES = [
        re.compile(
            r"^(?P<description>[A-Za-z][A-Za-z0-9\s\/\-\.\#\(\)]+?)\s+(?P<quantity>\d+(?:\.\d+)?)$"
        ),
        re.compile(
            r"^(?P<description>[A-Za-z][A-Za-z0-9\s\/\-\.\#\(\)]+?)\s+(?:qty|quantity)\s*[:#]?\s*(?P<quantity>\d+(?:\.\d+)?)$",
            re.IGNORECASE,
        ),
    ]

    def parse_many(self, ticket_texts: list[str]) -> list[ParsedTicket]:
        return [self.parse(text) for text in ticket_texts]

    def parse(self, text: str) -> ParsedTicket:
        ticket_number = self._extract_ticket_number(text)
        ticket_date = self._extract_ticket_date(text)
        parsed_items: list[TicketItem] = []

        for raw_line in lines(text):
            cleaned = self._clean_line(raw_line)
            if not cleaned:
                continue
            if self._looks_like_noise(cleaned):
                continue

            item = self._parse_item_line(cleaned, ticket_number, ticket_date)
            if item:
                parsed_items.append(item)

        if not parsed_items:
            fallback_items = self._fallback_extract_keywords(text, ticket_number, ticket_date)
            parsed_items.extend(fallback_items)

        return ParsedTicket(
            ticket_number=ticket_number,
            ticket_date=ticket_date,
            items=self._dedupe_items(parsed_items),
            raw_text=text,
        )

    def _parse_item_line(
        self,
        line: str,
        ticket_number: str | None,
        ticket_date: str | None,
    ) -> TicketItem | None:
        for regex in self.ITEM_WITH_QTY_REGEXES:
            match = regex.match(line)
            if match:
                description = self._normalize_description(match.group("description"))
                quantity = to_float(match.group("quantity"))
                if description and self._looks_like_real_item(description):
                    return TicketItem(
                        description=description,
                        quantity=quantity,
                        ticket_number=ticket_number,
                        ticket_date=ticket_date,
                        raw_line=line,
                    )

        if self._looks_like_real_item(line):
            return TicketItem(
                description=self._normalize_description(line),
                quantity=None,
                ticket_number=ticket_number,
                ticket_date=ticket_date,
                raw_line=line,
            )

        return None

    def _fallback_extract_keywords(
        self,
        text: str,
        ticket_number: str | None,
        ticket_date: str | None,
    ) -> list[TicketItem]:
        results: list[TicketItem] = []
        seen: set[str] = set()

        for raw_line in lines(text):
            cleaned = self._clean_line(raw_line)
            if not cleaned or self._looks_like_noise(cleaned):
                continue
            if not self._looks_like_real_item(cleaned):
                continue

            normalized = self._normalize_description(cleaned)
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)

            results.append(
                TicketItem(
                    description=normalized,
                    quantity=None,
                    ticket_number=ticket_number,
                    ticket_date=ticket_date,
                    raw_line=raw_line,
                )
            )

        return results[:20]

    def _extract_ticket_number(self, text: str) -> str | None:
        match = self.TICKET_NUMBER_REGEX.search(text)
        if match:
            return match.group(1).strip()
        return None

    def _extract_ticket_date(self, text: str) -> str | None:
        match = self.DATE_REGEX.search(text)
        if match:
            return match.group(1)
        return None

    def _clean_line(self, line: str) -> str:
        return re.sub(r"\s+", " ", line).strip()

    def _normalize_description(self, value: str) -> str:
        value = re.sub(r"\s+", " ", value).strip(" .,:;|-")
        return value[:160]

    def _looks_like_noise(self, line: str) -> bool:
        lowered = line.lower()

        if any(pattern.search(line) for pattern in self.NOISE_PATTERNS):
            return True

        if "/" in line and len(re.findall(r"\d", line)) >= 4:
            return True

        if "(" in line or ")" in line:
            return True

        if re.fullmatch(r"[\d\W]+", line):
            return True

        if len(line) < 4:
            return True

        if lowered in {"qty", "quantity", "description", "item", "units"}:
            return True

        return False

    def _looks_like_real_item(self, line: str) -> bool:
        lowered = line.lower()

        if not re.search(r"[A-Za-z]", line):
            return False

        blocked = [
            "delivery date",
            "ship date",
            "driver",
            "customer",
            "order #",
            "truck",
            "please remit",
            "new york",
            "staten island",
            "brooklyn",
        ]
        if any(token in lowered for token in blocked):
            return False

        alpha_words = re.findall(r"[A-Za-z]{3,}", line)
        if len(alpha_words) < 2:
            return False

        digit_groups = re.findall(r"\d+", line)
        if len(digit_groups) > 4:
            return False

        return True

    def _dedupe_items(self, items: list[TicketItem]) -> list[TicketItem]:
        deduped: list[TicketItem] = []
        seen: set[tuple[str, str | None, str | None]] = set()

        for item in items:
            key = (
                item.description.lower(),
                item.ticket_number,
                item.ticket_date,
            )
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)

        return deduped