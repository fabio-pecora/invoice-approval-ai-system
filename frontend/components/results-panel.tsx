import {
  ApprovalResponse,
  ExtractedDocumentData,
  StageResult,
} from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not found";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Not found";
  }

  return String(value);
}

function getInvoiceDetail(detail?: ExtractedDocumentData) {
  if (!detail) {
    return {
      vendorName: "Not found",
      invoiceDate: "Not found",
      invoiceTotal: "Not found",
      preview: "No preview available.",
    };
  }

  return {
    vendorName: formatValue(detail.key_fields?.vendor_name),
    invoiceDate: formatValue(detail.key_fields?.invoice_date),
    invoiceTotal: formatValue(detail.key_fields?.invoice_total),
    preview: detail.raw_text_preview || "No preview available.",
  };
}

function getStageTone(status: string) {
  if (status === "Approved") {
    return {
      bg: "#ecfdf5",
      border: "#bbf7d0",
      text: "#166534",
      label: "Passed",
    };
  }

  if (status === "Not Approved") {
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      text: "#991b1b",
      label: "Failed",
    };
  }

  return {
    bg: "#fffbeb",
    border: "#fde68a",
    text: "#92400e",
    label: "Needs review",
  };
}

function StageSummaryCard({ stage }: { stage: StageResult }) {
  const tone = getStageTone(stage.status);

  return (
    <div
      style={{
        background: tone.bg,
        border: `1px solid ${tone.border}`,
        borderRadius: 16,
        padding: 16,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0.35,
          color: tone.text,
          marginBottom: 8,
        }}
      >
        {stage.name}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: tone.text,
          marginBottom: 8,
        }}
      >
        {tone.label}
      </div>

      <div
        style={{
          color: "#334155",
          lineHeight: 1.6,
          fontSize: 14,
        }}
      >
        {stage.summary}
      </div>
    </div>
  );
}

function InvoicePreview({ detail }: { detail?: ExtractedDocumentData }) {
  const invoice = getInvoiceDetail(detail);

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>
          Invoice details
        </h3>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Vendor name
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {invoice.vendorName}
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Date
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {invoice.invoiceDate}
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Total price
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
            {invoice.invoiceTotal}
          </div>
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 10,
          }}
        >
          Invoice preview
        </div>

        <div
          style={{
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 14,
            padding: 16,
            fontSize: 13,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "anywhere",
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {invoice.preview}
        </div>
      </div>
    </section>
  );
}

function CalculationDetails({ stage }: { stage?: StageResult }) {
  if (!stage) {
    return null;
  }

  const aiCalculatedTotal = formatValue(
    stage.extracted_data?.ai_calculated_total,
  );
  const invoiceTotalFound = formatValue(
    stage.extracted_data?.invoice_total_found,
  );

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.35,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Detailed review
          </div>
          <h3 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>
            Calculation check
          </h3>
        </div>

        <StatusBadge status={stage.status} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#1d4ed8",
              marginBottom: 6,
            }}
          >
            AI calculated total
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            {aiCalculatedTotal}
          </div>
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Invoice total
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
            {invoiceTotalFound}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: 0.3,
            marginBottom: 8,
          }}
        >
          Explanation
        </div>
        <p style={{ margin: 0, lineHeight: 1.75, color: "#334155" }}>
          {stage.explanation}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#9a3412",
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
            }}
          >
            Issues found
          </div>

          {stage.issues_found.length > 0 ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: "#7c2d12",
                lineHeight: 1.7,
              }}
            >
              {stage.issues_found.map((issue, index) => (
                <li key={`calc-issue-${index}`}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#9a3412", lineHeight: 1.7 }}>
              No meaningful issues found.
            </p>
          )}
        </div>

        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#475569",
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
            }}
          >
            Warnings
          </div>

          {stage.warnings.length > 0 ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                color: "#334155",
                lineHeight: 1.7,
              }}
            >
              {stage.warnings.map((warning, index) => (
                <li key={`calc-warning-${index}`}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.7 }}>
              No warnings returned.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export function ResultsPanel({ result }: { result: ApprovalResponse }) {
  const invoiceDetail = result.extraction_details.find(
    (detail) => detail.key_fields?.document_type === "invoice",
  );

  const calculationStage = result.stages.find(
    (stage) => stage.name === "Calculation Check",
  );
  const ticketStage = result.stages.find(
    (stage) => stage.name === "Ticket Match Check",
  );
  const pricingStage = result.stages.find(
    (stage) => stage.name === "Pricing Breakdown Check",
  );

  return (
    <div
      style={{
        display: "grid",
        gap: 24,
        minWidth: 0,
        width: "100%",
      }}
    >
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>
            Invoice review result
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {calculationStage ? (
            <StageSummaryCard stage={calculationStage} />
          ) : null}
          {ticketStage ? <StageSummaryCard stage={ticketStage} /> : null}
          {pricingStage ? <StageSummaryCard stage={pricingStage} /> : null}
        </div>
      </section>

      <InvoicePreview detail={invoiceDetail} />

      <CalculationDetails stage={calculationStage} />
    </div>
  );
}
