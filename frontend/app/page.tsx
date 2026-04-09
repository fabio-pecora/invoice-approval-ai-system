'use client';

import { useMemo, useState } from 'react';

import { ResultsPanel } from '@/components/results-panel';
import { UploadPanel } from '@/components/upload-panel';
import { runApproval } from '@/lib/api';
import { ApprovalResponse } from '@/lib/types';

export default function HomePage() {
  const [invoice, setInvoice] = useState<File | null>(null);
  const [tickets, setTickets] = useState<File[]>([]);
  const [pricingBreakdown, setPricingBreakdown] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApprovalResponse | null>(null);

  const invoiceFiles = useMemo(() => (invoice ? [invoice] : []), [invoice]);
  const pricingFiles = useMemo(() => (pricingBreakdown ? [pricingBreakdown] : []), [pricingBreakdown]);

  const handleRunApproval = async () => {
    if (!invoice) {
      setError('An invoice PDF is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const response = await runApproval({ invoice, tickets, pricingBreakdown });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong while running approval.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Invoice Approval System</p>
          <h1>Safety-first invoice review for AP/AR agents</h1>
          <p className="hero-copy">
            Upload one invoice, optionally add tickets and a pricing breakdown, then run a structured review across Calculation Check, Ticket Match Check, and Pricing Breakdown Check.
          </p>
        </div>
      </section>

      <section className="layout-grid">
        <div className="left-column">
          <UploadPanel
            title="Invoice PDF"
            description="Required. Upload the invoice to review."
            files={invoiceFiles}
            onChange={(files) => setInvoice(files[0] || null)}
          />

          <UploadPanel
            title="Ticket PDFs"
            description="Optional. Upload zero or more ticket PDFs for support matching."
            multiple
            files={tickets}
            onChange={setTickets}
          />

          <UploadPanel
            title="Pricing Breakdown PDF"
            description="Optional. Upload a pricing or rate sheet to verify unit prices."
            files={pricingFiles}
            onChange={(files) => setPricingBreakdown(files[0] || null)}
          />

          <section className="panel action-panel">
            <button className="run-button" onClick={handleRunApproval} disabled={loading}>
              {loading ? 'Running Approval...' : 'Run Approval'}
            </button>
            <p className="helper-text">
              The system uses deterministic checks first, then OCR, and only uses LLM interpretation as a fallback when configured.
            </p>
            {error ? <p className="error-text">{error}</p> : null}
          </section>
        </div>

        <div className="right-column">
          {loading ? (
            <section className="panel loading-panel">
              <h3>Review in progress</h3>
              <p>The backend is extracting text, checking calculations, comparing tickets, and validating pricing.</p>
            </section>
          ) : null}

          {!loading && result ? (
            <ResultsPanel result={result} />
          ) : !loading ? (
            <section className="panel empty-panel">
              <h3>No review yet</h3>
              <p>Upload your documents and click Run Approval to see a stage-by-stage result.</p>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
