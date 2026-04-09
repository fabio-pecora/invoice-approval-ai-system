from __future__ import annotations

import re
from dataclasses import dataclass

from app.utils.text_utils import lines, to_float


@dataclass
class PricingRule:
    description: str
    unit_rate: float
    raw_line: str


class PricingParser:
    MONEY_REGEX = re.compile(r"\$?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)")

    def parse(self, text: str) -> list[PricingRule]:
        rules: list[PricingRule] = []
        for line in lines(text):
            values = [to_float(match) for match in self.MONEY_REGEX.findall(line)]
            values = [value for value in values if value is not None]
            if not values:
                continue
            description = re.sub(self.MONEY_REGEX, "", line).strip(" -|\t")
            if len(description) < 3:
                continue
            rules.append(
                PricingRule(
                    description=description[:160],
                    unit_rate=values[-1],
                    raw_line=line,
                )
            )
        return rules
