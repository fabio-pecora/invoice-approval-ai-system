"use client";

import { useMemo, useState } from "react";
import { ResultsPanel } from "@/components/results-panel";
import { UploadPanel } from "@/components/upload-panel";
import { runApproval } from "@/lib/api";
import { ApprovalResponse } from "@/lib/types";

export default function HomePage() {
  const [invoice, setInvoice] = useState<File | null>(null);
  const [tickets, setTickets] = useState<File[]>([]);
  const [pricingBreakdown, setPricingBreakdown] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApprovalResponse | null>(null);

  const invoiceFiles = useMemo<File[]>(
    () => (invoice ? [invoice] : []),
    [invoice],
  );
  const pricingFiles = useMemo<File[]>(
    () => (pricingBreakdown ? [pricingBreakdown] : []),
    [pricingBreakdown],
  );

  const handleRunApproval = async () => {
    if (!invoice) {
      setError("An invoice PDF is required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await runApproval({
        invoice,
        tickets,
        pricingBreakdown,
      });

      setResult(response);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while running review.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
        padding: "32px 20px 56px",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "grid",
          gap: 28,
        }}
      >
        <section
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #1e293b 100%)",
            color: "#ffffff",
            borderRadius: 28,
            padding: "30px 28px",
            boxShadow: "0 20px 45px rgba(15, 23, 42, 0.18)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              color: "#bfdbfe",
              marginBottom: 10,
            }}
          >
            Invoice Approval AI System
          </div>

          <h1
            style={{
              margin: "0 0 12px 0",
              fontSize: "clamp(32px, 4vw, 48px)",
              lineHeight: 1.1,
            }}
          >
            AI invoice review for AP/AR teams
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 900,
              fontSize: 17,
              lineHeight: 1.8,
              color: "#dbeafe",
            }}
          >
            Upload an invoice, optionally add tickets and a pricing breakdown,
            then run one unified AI review across calculations, support
            documents, and pricing consistency.
          </p>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: result ? "360px minmax(0, 1fr)" : "1fr",
            gap: 28,
            alignItems: "start",
          }}
        >
          <div
            style={{
              minWidth: 0,
              position: result ? "sticky" : "static",
              top: 20,
              alignSelf: "start",
              zIndex: 1,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 22,
                padding: 20,
                boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
              }}
            >
              <UploadPanel
                title="Invoice PDF"
                description="Required. Upload the invoice that needs to be reviewed."
                multiple={false}
                files={invoiceFiles}
                onChange={(files) => setInvoice(files[0] || null)}
              />

              <div style={{ height: 14 }} />

              <UploadPanel
                title="Ticket PDFs"
                description="Optional. Add one or more support tickets for item verification."
                multiple={true}
                files={tickets}
                onChange={(files) => setTickets(files)}
              />

              <div style={{ height: 14 }} />

              <UploadPanel
                title="Pricing Breakdown PDF"
                description="Optional. Add a rate sheet or pricing breakdown to verify charges."
                multiple={false}
                files={pricingFiles}
                onChange={(files) => setPricingBreakdown(files[0] || null)}
              />

              <button
                type="button"
                onClick={handleRunApproval}
                disabled={loading}
                style={{
                  width: "100%",
                  marginTop: 18,
                  border: "none",
                  borderRadius: 16,
                  padding: "16px 18px",
                  background: loading
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                  color: "#ffffff",
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: loading
                    ? "none"
                    : "0 12px 24px rgba(37, 99, 235, 0.25)",
                }}
              >
                {loading ? "Running review..." : "Run Invoice Review"}
              </button>

              <p
                style={{
                  marginTop: 12,
                  marginBottom: 0,
                  color: "#64748b",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                The system extracts document text and lets the AI review the
                invoice as a whole, including calculations, support tickets, and
                pricing when provided.
              </p>
            </div>

            {error ? (
              <div
                style={{
                  marginTop: 16,
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  color: "#9f1239",
                  borderRadius: 18,
                  padding: 16,
                  lineHeight: 1.7,
                  boxShadow: "0 10px 24px rgba(190, 24, 93, 0.08)",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 6 }}>
                  Review failed
                </div>
                <div>{error}</div>
              </div>
            ) : null}
          </div>

          <div
            style={{
              minWidth: 0,
              width: "100%",
              overflow: "hidden",
            }}
          >
            {loading ? (
              <section
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 22,
                  padding: 24,
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#2563eb",
                    textTransform: "uppercase",
                    letterSpacing: 0.35,
                    marginBottom: 10,
                  }}
                >
                  Review in progress
                </div>

                <h2
                  style={{ marginTop: 0, marginBottom: 10, color: "#0f172a" }}
                >
                  The invoice is being analyzed
                </h2>

                <p style={{ margin: 0, color: "#475569", lineHeight: 1.8 }}>
                  The backend is extracting the document text and sending it to
                  the AI for a full review of calculations, ticket support, and
                  pricing consistency.
                </p>
              </section>
            ) : null}

            {!loading && result ? <ResultsPanel result={result} /> : null}

            {!loading && !result ? (
              <section
                style={{
                  background: "#ffffff",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 22,
                  padding: 32,
                  textAlign: "center",
                  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 800,
                    margin: "0 auto 18px",
                  }}
                >
                  AI
                </div>

                <h2
                  style={{ marginTop: 0, marginBottom: 10, color: "#0f172a" }}
                >
                  No review yet
                </h2>

                <p
                  style={{
                    margin: "0 auto",
                    maxWidth: 700,
                    color: "#64748b",
                    lineHeight: 1.8,
                  }}
                >
                  Upload your invoice and any supporting files, then click{" "}
                  <strong>Run Invoice Review</strong>
                  to get a clean stage-by-stage result.
                </p>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
