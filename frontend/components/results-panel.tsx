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
    <article className="document-card">
      <div className="document-card-head">
        <div>
          <p className="document-label">Document</p>
          <h4>{detail.source_name}</h4>
        </div>
        <span className="method-badge">
          {detail.extraction_method.toUpperCase()}
        </span>
      </div>

      <div className="quality-row">
        <div className="quality-head">
          <strong>Text quality</strong>
          <span>{Math.round(detail.text_quality_score * 100)}%</span>
        </div>
        <div className="quality-bar-track" aria-hidden="true">
          <div
            className="quality-bar-fill"
            style={{
              width: `${Math.max(6, Math.round(detail.text_quality_score * 100))}%`,
            }}
          />
        </div>
      </div>

      <div className="key-fields-block">
        <h5>Key fields</h5>
        {keyFieldEntries.length > 0 ? (
          <div className="key-fields-grid">
            {keyFieldEntries.map(([key, value]) => (
              <div key={key} className="key-field-item">
                <span className="key-field-label">{formatKey(key)}</span>
                <span className="key-field-value">{formatValue(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="helper-text">
            No key fields were extracted from this document.
          </p>
        )}
      </div>

      <div className="preview-block">
        <h5>Text preview</h5>
        <div className="preview-box">
          {detail.raw_text_preview || "No preview available."}
        </div>
      </div>
    </article>
  );
}

export function ResultsPanel({ result }: { result: ApprovalResponse }) {
  return (
    <div className="results-stack">
      <section className="panel overall-panel">
        <div className="stage-head">
          <div>
            <h2>Overall Invoice Status</h2>
            <p>{result.overall_summary}</p>
          </div>
          <StatusBadge status={result.overall_status} />
        </div>
        <p className="block-text">{result.overall_explanation}</p>
        <div className="summary-grid">
          <div>
            <strong>Invoice File</strong>
            <span>{result.invoice_filename}</span>
          </div>
          <div>
            <strong>Stages</strong>
            <span>{result.stages.length}</span>
          </div>
        </div>
      </section>

      <section className="panel extraction-panel">
        <div className="section-title-row">
          <div>
            <h3>Extraction Details</h3>
            <p className="helper-text">
              Review how each uploaded document was read before trusting the
              stage results.
            </p>
          </div>
        </div>
        <div className="document-grid">
          {result.extraction_details.map((detail) => (
            <ExtractionCard key={detail.source_name} detail={detail} />
          ))}
        </div>
      </section>

      {result.stages.map((stage) => (
        <StageCard key={stage.name} stage={stage} />
      ))}
    </div>
  );
}
