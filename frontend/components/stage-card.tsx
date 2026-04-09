import { StatusBadge } from "@/components/status-badge";
import { StageResult } from "@/lib/types";

function asList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function renderReviewData(stage: StageResult) {
  const reviewBasis = asList(stage.extracted_data?.review_basis);
  const matchedExamples = asList(stage.extracted_data?.matched_examples);
  const unmatchedExamples = asList(stage.extracted_data?.unmatched_examples);
  const notes = asList(stage.extracted_data?.notes);

  const sections = [
    { title: "What this stage looked at", values: reviewBasis },
    { title: "Matched examples", values: matchedExamples },
    { title: "Items needing attention", values: unmatchedExamples },
    { title: "Notes", values: notes },
  ].filter((section) => section.values.length > 0);

  if (sections.length === 0) {
    return (
      <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
        No additional structured details were returned for this stage.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {sections.map((section) => (
        <div key={section.title}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 8,
            }}
          >
            {section.title}
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: "#334155",
              lineHeight: 1.7,
            }}
          >
            {section.values.map((value, index) => (
              <li key={`${section.title}-${index}`}>{value}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function StageCard({ stage }: { stage: StageResult }) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 22,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div>
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
            Review Stage
          </div>
          <h3 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>
            {stage.name}
          </h3>
        </div>

        <StatusBadge status={stage.status} />
      </div>

      <p
        style={{
          marginTop: 0,
          marginBottom: 12,
          fontSize: 17,
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.5,
        }}
      >
        {stage.summary}
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Confidence {Math.round(stage.confidence * 100)}%
        </span>

        <span
          style={{
            background: "#f8fafc",
            color: "#334155",
            border: "1px solid #e2e8f0",
            borderRadius: 999,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          AI Review
        </span>
      </div>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: 0.3,
            marginBottom: 8,
          }}
        >
          Explanation
        </div>
        <p style={{ margin: 0, color: "#334155", lineHeight: 1.75 }}>
          {stage.explanation}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
          marginBottom: 18,
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
              fontWeight: 700,
              color: "#9a3412",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            Issues Found
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
                <li key={`${stage.name}-issue-${index}`}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#9a3412", lineHeight: 1.6 }}>
              No meaningful issues were found in this stage.
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
              fontWeight: 700,
              color: "#475569",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.3,
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
                <li key={`${stage.name}-warning-${index}`}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: "#64748b", lineHeight: 1.6 }}>
              No warnings were returned.
            </p>
          )}
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: 18,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: "#0f172a",
            marginBottom: 12,
          }}
        >
          Supporting details
        </div>

        {renderReviewData(stage)}
      </div>
    </section>
  );
}
