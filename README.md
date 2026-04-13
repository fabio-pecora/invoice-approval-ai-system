# Check my demo

https://drive.google.com/file/d/1IObwLg_0qfPt-GH6S76wYALpIRx9X3Xm/view?usp=sharing

# Invoice Approval System

A safety-first invoice review system for AP/AR agents.

This project accepts:
- one invoice PDF
- zero or more ticket PDFs
- one optional pricing breakdown PDF

It evaluates the invoice through three approval stages:
- **Calculation Check**
- **Ticket Match Check**
- **Pricing Breakdown Check**

The system is designed to be conservative:
- deterministic parsing and rules first
- OCR second if needed
- optional LLM fallback only for ambiguous interpretation
- if confidence is too low, the result is **Requires Human Review**

## Tech Stack

### Backend
- Python 3.11+
- FastAPI
- pdfplumber + pypdf for native PDF text extraction
- PyMuPDF for PDF page rendering
- pytesseract for OCR fallback
- rapidfuzz for safe fuzzy matching
- optional OpenAI fallback through environment variables

### Frontend
- Next.js 14
- React 18
- TypeScript
- simple CSS for a clean local UI

## Why this architecture

This stack keeps the project easy to run locally on Windows while still giving you:
- a clean browser UI
- a Python backend for document processing
- deterministic review logic with OCR fallback
- optional LLM interpretation without making the core system depend on it

## Final statuses used by the system

Overall and stage-level statuses use these exact labels:
- **Approved**
- **Partially Approved**
- **Requires Human Review**
- **Not Approved**

## Project Structure

```text
invoice-approval-system/
├── .gitignore
├── README.md
├── start-backend.bat
├── start-frontend.bat
├── backend/
│   ├── .env.example
│   ├── requirements.txt
│   └── app/
│       ├── __init__.py
│       ├── main.py
│       ├── api/
│       │   ├── __init__.py
│       │   └── routes.py
│       ├── core/
│       │   ├── config.py
│       │   └── logging.py
│       ├── models/
│       │   └── __init__.py
│       ├── sample_data/
│       │   └── generate_sample_pdfs.py
│       ├── schemas/
│       │   ├── __init__.py
│       │   └── approval.py
│       ├── services/
│       │   ├── approval_service.py
│       │   ├── calculation_checker.py
│       │   ├── confidence_service.py
│       │   ├── invoice_parser.py
│       │   ├── llm_service.py
│       │   ├── pdf_extraction.py
│       │   ├── pricing_checker.py
│       │   ├── pricing_parser.py
│       │   ├── ticket_matcher.py
│       │   └── ticket_parser.py
│       ├── storage/
│       │   ├── extracted/
│       │   │   └── .gitkeep
│       │   ├── results/
│       │   │   └── .gitkeep
│       │   └── uploads/
│       │       └── .gitkeep
│       └── utils/
│           ├── file_utils.py
│           └── text_utils.py
└── frontend/
    ├── .env.local.example
    ├── next-env.d.ts
    ├── next.config.js
    ├── package.json
    ├── tsconfig.json
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── file-list.tsx
    │   ├── results-panel.tsx
    │   ├── stage-card.tsx
    │   ├── status-badge.tsx
    │   └── upload-panel.tsx
    ├── lib/
    │   ├── api.ts
    │   └── types.ts
    └── public/
```

## Prerequisites for Windows

Install these first:
- **Python 3.11 or newer**
- **Node.js 18 or newer**
- **Tesseract OCR for Windows**
- VS Code

## Install Tesseract OCR on Windows

1. Download the Windows installer from the UB Mannheim Tesseract builds page.
2. Install it to the default path:
   `C:\Program Files\Tesseract-OCR`
3. Make sure `tesseract.exe` exists here:
   `C:\Program Files\Tesseract-OCR\tesseract.exe`
4. Keep that exact path in `backend/.env`

If you install Tesseract somewhere else, update this line in `backend/.env`:

```env
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

## Backend setup

Open a terminal in VS Code and run:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

If you want optional LLM fallback, add your API key inside `backend/.env`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

If you do not add an API key, the app still works. It simply skips LLM fallback safely.

Run the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend URL:
- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

## Frontend setup

Open another terminal in VS Code and run:

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Frontend URL:
- `http://localhost:3000`

## Quick start with the batch files

From the project root you can also use:
- `start-backend.bat`
- `start-frontend.bat`

These are convenience scripts for Windows.

## How the approval logic works

### 1. Calculation Check

The system tries to parse:
- item or service description
- quantity
- unit price
- line total
- subtotal
- tax
- fees
- grand total

It checks:
- quantity × unit price = line total
- sum of line totals = subtotal when subtotal is available
- subtotal + tax + fees = grand total when totals are available

If the values cannot be parsed safely, this stage becomes:
- **Requires Human Review**

If deterministic math fails, this stage becomes:
- **Not Approved**

### 2. Ticket Match Check

The system extracts likely entries from ticket PDFs and compares them against invoice lines.
It uses conservative fuzzy matching.
If the match is weak or unclear, it does not auto-approve.

Possible outcomes:
- all clear matches: **Approved**
- some supported, some unclear: **Partially Approved**
- ambiguous support: **Requires Human Review**
- missing support: **Not Approved**

### 3. Pricing Breakdown Check

The system extracts likely pricing rules from the pricing PDF and compares them to invoice unit prices.
It uses conservative fuzzy matching for description mapping.
If the mapping is uncertain, it does not auto-approve.

Possible outcomes:
- all clear matches: **Approved**
- some matches and some unclear: **Partially Approved**
- unclear mapping: **Requires Human Review**
- clear price mismatches: **Not Approved**

## OCR and LLM fallback order

The system follows this exact philosophy:

1. native PDF text extraction
2. OCR when native extraction quality is poor
3. optional LLM interpretation only if ambiguity remains
4. never use the LLM to override deterministic failures
5. if confidence is low, return **Requires Human Review**

## Generating sample test PDFs

The project includes a small script that generates sample PDFs for local testing.

Run:

```bash
cd backend
.venv\Scripts\activate
python app/sample_data/generate_sample_pdfs.py
```

This creates sample files in:
- `backend/app/sample_data/sample_invoice.pdf`
- `backend/app/sample_data/sample_ticket_1.pdf`
- `backend/app/sample_data/sample_ticket_2.pdf`
- `backend/app/sample_data/sample_pricing_breakdown.pdf`

## Testing the app

1. Start the backend.
2. Start the frontend.
3. Open `http://localhost:3000`
4. Upload:
   - `sample_invoice.pdf`
   - the two ticket PDFs
   - `sample_pricing_breakdown.pdf`
5. Click **Run Approval**

## Notes about confidence and safety

This project is intentionally conservative.
It is built to reduce false approvals.
If parsing is weak, if mapping is unclear, or if support is incomplete, the system should lean toward:
- **Requires Human Review**
- or **Not Approved**

## Troubleshooting

### Backend fails because Tesseract is missing
Check that this file exists:

```text
C:\Program Files\Tesseract-OCR\tesseract.exe
```

Then make sure `backend/.env` points to it.

### Frontend cannot reach backend
Check that:
- backend is running on port 8000
- `frontend/.env.local` contains:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

### OCR seems weak
That can happen with low-quality scans. The app will reduce confidence and prefer human review instead of approving risky cases.

## Future improvements you could add later

A few natural next steps:
- stronger table extraction for invoices with very complex layouts
- file history and saved review sessions
- user authentication and reviewer notes
- CSV export of approval results
- database persistence

