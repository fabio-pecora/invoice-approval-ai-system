from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def to_float(value: str | float | int | None) -> float | None:
    if value is None:
        return None
    if isinstance(value, (float, int)):
        return float(value)

    cleaned = value.replace(",", "").replace("$", "").strip()
    if cleaned in {"", ".", "-"}:
        return None

    try:
        return float(Decimal(cleaned))
    except (InvalidOperation, ValueError):
        return None


MONEY_PATTERN = re.compile(r"\$?\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)")


def extract_money_values(text: str) -> list[float]:
    values: list[float] = []
    for match in MONEY_PATTERN.findall(text):
        value = to_float(match)
        if value is not None:
            values.append(value)
    return values


def clean_token(token: str) -> str:
    token = token.lower().strip()
    token = re.sub(r"[^a-z0-9\s\-/]", "", token)
    return normalize_whitespace(token)
