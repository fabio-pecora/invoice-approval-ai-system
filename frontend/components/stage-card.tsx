import { StatusBadge } from "@/components/status-badge";
import { StageResult } from "@/lib/types";

function prettyJson(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2);
}

export function StageCard({ stage }: { stage: StageResult }) {
  return (
    <section className="panel stage-card">
      <div className="stage-head">
        <div>
          <h3>{stage.name}</h3>
          <p>{stage.summary}</p>
        </div>
        <StatusBadge status={stage.status} />
      </div>

      <div className="stage-meta">
        <div className="meta-card">
          <span className="meta-label">Confidence</span>
          <strong className="meta-value">
            {Math.round(stage.confidence * 100)}%
          </strong>
        </div>
        <div className="meta-card">
          <span className="meta-label">LLM fallback</span>
          <strong className="meta-value">
            {stage.llm_used ? "Used" : "Not used"}
          </strong>
        </div>
      </div>

      <p className="block-text">{stage.explanation}</p>

      <div className="grid-two info-sections">
        <div className="subpanel">
          <h4>Issues Found</h4>
          {stage.issues_found.length > 0 ? (
            <ul className="bullet-list compact-list">
              {stage.issues_found.map((issue, index) => (
                <li key={`${stage.name}-issue-${index}`}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="helper-text">No direct issues reported.</p>
          )}
        </div>
        <div className="subpanel">
          <h4>Warnings</h4>
          {stage.warnings.length > 0 ? (
            <ul className="bullet-list compact-list">
              {stage.warnings.map((warning, index) => (
                <li key={`${stage.name}-warning-${index}`}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="helper-text">No warnings reported.</p>
          )}
        </div>
      </div>

      <div className="subpanel extracted-data-panel">
        <h4>Extracted Data</h4>
        <pre className="json-box">{prettyJson(stage.extracted_data)}</pre>
      </div>
    </section>
  );
}
