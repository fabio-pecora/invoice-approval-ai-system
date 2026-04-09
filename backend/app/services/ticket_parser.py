from __future__ import annotations

import re
from dataclasses import dataclass

from app.utils.text_utils import clean_token, lines, to_float


@dataclass
class TicketEntry:
    description: str
    quantity: float | None
    date: str | None
    identifier: str | None
    raw_line: str


class TicketParser:
    DATE_REGEX = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b")
    ID_REGEX = re.compile(r"\b(?:ticket|load|delivery|job|ref)\s*#?\s*([a-z0-9-]+)", re.IGNORECASE)

    def parse(self, text: str) -> list[TicketEntry]:
        entries: list[TicketEntry] = []
        for line in lines(text):
            if len(line) < 5:
                continue
            qty_match = re.search(r"\b(\d+(?:\.\d+)?)\b", line)
            quantity = to_float(qty_match.group(1)) if qty_match else None
            date_match = self.DATE_REGEX.search(line)
            id_match = self.ID_REGEX.search(line)
            normalized = clean_token(line)
            if any(keyword in normalized for keyword in ["ticket", "delivery", "material", "service", "labor", "haul", "concrete", "dump", "load"]):
                entries.append(
                    TicketEntry(
                        description=line[:180],
                        quantity=quantity,
                        date=date_match.group(1) if date_match else None,
                        identifier=id_match.group(1) if id_match else None,
                        raw_line=line,
                    )
                )
        return entries
