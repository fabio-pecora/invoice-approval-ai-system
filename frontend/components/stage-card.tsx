"use client";

type StageResult = {
  stage_name: string;
  status: "Approved" | "Partially Approved" | "Requires Human Review" | "Not Approved";
  explanation: string;
  confidence: number;
  llm_fallback_used: boolean;
  issues_found: string[];
  warnings: string[];
  extracted_data?: any;
};

type Props = {
  stage: StageResult;
};

function statusClass(status: StageResult["status"]) {
  switch (status) {
    case "Approved":
      return "status-approved";
    case "Partially Approved":
      return "status-partial";
    case "Requires Human Review":
      return "status-review";
    case "Not Approved":
      return "status-rejected";
    default:
      return "status-review";
  }
}

function formatPercent(value: number | undefined) {
  if (typeof value !== "number") return "N/A";
  return `${value}%`;
}

function renderList(items: string[]) {
  if (!items || items.length === 0) {
    return <p className="muted-text">No direct issues reported.</p>;
  }

  return (
    <ul className="bullet-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function renderKeyValueCard(title: string, value: string | number) {
  return (
    <div className="mini-stat-card">
      <div className="mini-stat-label">{title}</div>
      <div className="mini-stat-value">{value}</div>
    </div>
  );
}

function renderTicketSection(data: any) {
  const summary = data?.support_summary ?? {};
  const matches = data?.matches ?? [];
  const missing = data?.missing_from_tickets ?? [];
  const extras = data?.extras_on_invoice ?? [];
  const uncertain = data?.uncertain_matches ?? [];

  return (
    <div className="ticket-check-layout">
      <div className="mini-stat-grid">
        {renderKeyValueCard("Invoice Items", summary.invoice_item_count ?? 0)}
        {renderKeyValueCard("Ticket Items", summary.ticket_item_count ?? 0)}
        {renderKeyValueCard("Strong Matches", summary.matched_count ?? 0)}
        {renderKeyValueCard("Uncertain Matches", summary.uncertain_count ?? 0)}
        {renderKeyValueCard("Unsupported Items", summary.unsupported_count ?? 0)}
      </div>

      <div className="structured-block">
        <h4>Matched Items</h4>
        {matches.length === 0 ? (
          <p className="muted-text">No strong ticket matches found.</p>
        ) : (
          <div className="structured-list">
            {matches.map((item: any, index: number) => (
              <div key={index} className="structured-row-card">
                <div className="structured-row-top">
                  <span className="structured-title">{item.invoice_description}</span>
                  <span className="pill pill-good">Supported</span>
                </div>
                <div className="structured-row-grid">
                  <div>
                    <span className="structured-label">Invoice Qty</span>
                    <span>{item.invoice_quantity ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="structured-label">Ticket Match</span>
                    <span>{item.matched_ticket_description ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="structured-label">Ticket Qty</span>
                    <span>{item.matched_ticket_quantity ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="structured-label">Similarity</span>
                    <span>{item.similarity ?? "N/A"}</span>
                  </div>
                </div>
                <p className="structured-reason">{item.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="structured-block">
        <h4>Missing Support</h4>
        {missing.length === 0 ? (
          <p className="muted-text">No missing support found.</p>
        ) : (
          <div className="structured-list">
            {missing.map((item: any, index: number) => (
              <div key={index} className="structured-row-card warning-card">
                <div className="structured-row-top">
                  <span className="structured-title">{item.invoice_description}</span>
                  <span className="pill pill-bad">Missing Support</span>
                </div>
                <div className="structured-row-grid">
                  <div>
                    <span className="structured-label">Invoice Qty</span>
                    <span>{item.invoice_quantity ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="structured-label">Closest Match</span>
                    <span>{item.matched_ticket_description ?? "None"}</span>
                  </div>
                  <div>
                    <span className="structured-label">Similarity</span>
                    <span>{item.similarity ?? "N/A"}</span>
                  </div>
                </div>
                <p className="structured-reason">{item.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="structured-block">
        <h4>Uncertain Matches</h4>
        {uncertain.length === 0 ? (
          <p className="muted-text">No uncertain matches found.</p>
        ) : (
          <div className="structured-list">
            {uncertain.map((item: any, index: number) => (
              <div key={index} className="structured-row-card neutral-card">
                <div className="structured-row-top">
                  <span className="structured-title">{item.invoice_description}</span>
                  <span className="pill pill-neutral">Review</span>
                </div>
                <div className="structured-row-grid">
                  <div>
                    <span className="structured-label">Closest Ticket Item</span>
                    <span>{item.matched_ticket_description ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="structured-label">Similarity</span>
                    <span>{item.similarity ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="structured-label">Quantity Check</span>
                    <span>{item.quantity_status ?? "unknown"}</span>
                  </div>
                </div>
                <p className="structured-reason">{item.reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {extras.length > 0 && (
        <div className="structured-block">
          <h4>Invoice Items That Need Attention</h4>
          <div className="structured-list">
            {extras.map((item: any, index: number) => (
              <div key={index} className="structured-row-card warning-card">
                <div className="structured-row-top">
                  <span className="structured-title">{item.invoice_description}</span>
                  <span className="pill pill-bad">Check Needed</span>
                </div>
                <p className="structured-reason">{item.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function renderDefaultJson(data: any) {
  if (!data) {
    return <p className="muted-text">No extracted data available.</p>;
  }

  return (
    <pre className="json-box">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function StageCard({ stage }: Props) {
  const isTicketStage = stage.stage_name === "Ticket Match Check";

  return (
    <section className="card stage-card">
      <div className="stage-card-header">
        <h3>{stage.stage_name}</h3>
        <span className={`status-badge ${statusClass(stage.status)}`}>{stage.status}</span>
      </div>

      <p className="stage-explanation">{stage.explanation}</p>

      <div className="stage-meta-grid">
        <div className="meta-card">
          <span className="meta-label">Confidence</span>
          <span className="meta-value">{formatPercent(stage.confidence)}</span>
        </div>
        <div className="meta-card">
          <span className="meta-label">LLM Fallback</span>
          <span className="meta-value">{stage.llm_fallback_used ? "Used" : "Not used"}</span>
        </div>
      </div>

      <div className="stage-columns">
        <div>
          <h4>Issues Found</h4>
          {renderList(stage.issues_found)}
        </div>
        <div>
          <h4>Warnings</h4>
          {stage.warnings && stage.warnings.length > 0 ? (
            <ul className="bullet-list">
              {stage.warnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>{warning}</li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">No warnings reported.</p>
          )}
        </div>
      </div>

      <div className="stage-extracted-data">
        <h4>Extracted Data</h4>
        {isTicketStage ? renderTicketSection(stage.extracted_data) : renderDefaultJson(stage.extracted_data)}
      </div>
    </section>
  );
}