from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

BASE_DIR = Path(__file__).resolve().parent


def make_pdf(filename: str, lines: list[str]) -> None:
    path = BASE_DIR / filename
    c = canvas.Canvas(str(path), pagesize=letter)
    width, height = letter
    y = height - 60
    for line in lines:
        c.drawString(50, y, line)
        y -= 18
        if y < 50:
            c.showPage()
            y = height - 60
    c.save()


make_pdf(
    "sample_invoice.pdf",
    [
        "Acme Ready Mix",
        "Invoice # INV-10045",
        "Date: 04/08/2026",
        "",
        "Concrete Delivery 10 125.00 1250.00",
        "Labor Service 4 85.00 340.00",
        "Fuel Surcharge 1 45.00 45.00",
        "Subtotal 1635.00",
        "Tax 130.80",
        "Grand Total 1765.80",
    ],
)

make_pdf(
    "sample_ticket_1.pdf",
    [
        "Delivery Ticket # DT-6001",
        "Date: 04/08/2026",
        "Concrete Delivery 10 yards",
        "Job Ref 2209-A",
    ],
)

make_pdf(
    "sample_ticket_2.pdf",
    [
        "Service Ticket # ST-1002",
        "Date: 04/08/2026",
        "Labor Service 4 hours",
        "Fuel Surcharge 1",
    ],
)

make_pdf(
    "sample_pricing_breakdown.pdf",
    [
        "Company Pricing Schedule",
        "Concrete Delivery 125.00",
        "Labor Service 85.00",
        "Fuel Surcharge 45.00",
    ],
)

print("Sample PDFs created in:", BASE_DIR)
