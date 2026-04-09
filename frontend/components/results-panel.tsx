import { ApprovalResponse, ExtractedDocumentData } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { StageCard } from "@/components/stage-card";

function formatKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not found";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Not found";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function ExtractionCard({ detail }: { detail: ExtractedDocumentData }) {
  const keyFieldEntries = Object.entries(detail.key_fields || {}).filter(
    ([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    },
  );

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 16,
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              color: "#64748b",
              marginBottom: 6,
            }}
          >
            Extracted Document
          </div>
          <h4
            style={{
              margin: 0,
              fontSize: 20,
              color: "#0f172a",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
            }}
          >
            {detail.source_name}
          </h4>
        </div>

        <div
          style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}
        >
          <span
            style={{
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              borderRadius: 999,
              padding: "6px 10px",
              fontWeight: 700,
            }}
          >
            {detail.extraction_method.toUpperCase()}
          </span>
          <span
            style={{
              background: "#f8fafc",
              color: "#334155",
              border: "1px solid #e2e8f0",
              borderRadius: 999,
              padding: "6px 10px",
              fontWeight: 700,
            }}
          >
            Text quality {Math.round(detail.text_quality_score * 100)}%
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 10,
          }}
        >
          Key fields
        </div>

        {keyFieldEntries.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {keyFieldEntries.map(([key, value]) => (
              <div
                key={key}
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 14,
                  padding: 14,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#64748b",
                    marginBottom: 6,
                    textTransform: "uppercase",
                    letterSpacing: 0.3,
                  }}
                >
                  {formatKey(key)}
                </div>
                <div
                  style={{
                    color: "#0f172a",
                    lineHeight: 1.5,
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {formatValue(value)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b" }}>
            No key fields were extracted from this document.
          </p>
        )}
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
          Text preview
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
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            maxHeight: 260,
            overflowY: "auto",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {detail.raw_text_preview || "No preview available."}
        </div>
      </div>
    </section>
  );
}

function getStatusCounts(result: ApprovalResponse) {
  return {
    approved: result.stages.filter((stage) => stage.status === "Approved")
      .length,
    review: result.stages.filter(
      (stage) => stage.status === "Requires Human Review",
    ).length,
    rejected: result.stages.filter((stage) => stage.status === "Not Approved")
      .length,
  };
}

export function ResultsPanel({ result }: { result: ApprovalResponse }) {
  const counts = getStatusCounts(result);

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
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: 22,
          padding: 24,
          boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "flex-start",
            marginBottom: 16,
            minWidth: 0,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 0.45,
                textTransform: "uppercase",
                color: "#93c5fd",
                marginBottom: 8,
              }}
            >
              Invoice Review Result
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                lineHeight: 1.25,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {result.invoice_filename}
            </h2>
          </div>

          <StatusBadge status={result.overall_status} />
        </div>

        <p
          style={{
            marginTop: 0,
            marginBottom: 10,
            fontSize: 18,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.5,
            overflowWrap: "anywhere",
          }}
        >
          {result.overall_summary}
        </p>

        <p
          style={{
            marginTop: 0,
            marginBottom: 18,
            color: "#cbd5e1",
            lineHeight: 1.8,
            maxWidth: 950,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {result.overall_explanation}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            minWidth: 0,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: 14,
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
              Stages
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {result.stages.length}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: 14,
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
              Approved stages
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {counts.approved}
            </div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: 14,
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
              Needs review
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{counts.review}</div>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: 14,
              minWidth: 0,
            }}
          >
            <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>
              Not approved
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>
              {counts.rejected}
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 16, minWidth: 0 }}>
        <div>
          <h3 style={{ marginBottom: 6, fontSize: 24, color: "#0f172a" }}>
            Extraction details
          </h3>
          <p style={{ marginTop: 0, color: "#64748b", lineHeight: 1.7 }}>
            This section shows what text was extracted from each uploaded
            document before the AI made its review.
          </p>
        </div>

        {result.extraction_details.map((detail) => (
          <ExtractionCard key={detail.source_name} detail={detail} />
        ))}
      </section>

      <section style={{ display: "grid", gap: 16, minWidth: 0 }}>
        <div>
          <h3 style={{ marginBottom: 6, fontSize: 24, color: "#0f172a" }}>
            Stage-by-stage review
          </h3>
          <p style={{ marginTop: 0, color: "#64748b", lineHeight: 1.7 }}>
            Each section explains what the AI checked, what it found, and
            whether there is anything that still needs human attention.
          </p>
        </div>

        {result.stages.map((stage) => (
          <StageCard key={stage.name} stage={stage} />
        ))}
      </section>
    </div>
  );
}
