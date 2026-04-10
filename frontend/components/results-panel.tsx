import {
  ApprovalResponse,
  ApprovalStatus,
  ExtractedDocumentData,
  StageResult,
} from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

type TicketMatchItem = {
  invoice_description?: string;
  invoice_quantity?: number | string;
  matched_ticket_description?: string;
  matched_ticket_quantity?: number | string;
  similarity?: number | string;
  reason?: string;
};

type TicketSupportSummary = {
  invoice_item_count?: number;
  ticket_item_count?: number;
  matched_count?: number;
  uncertain_count?: number;
  unsupported_count?: number;
};

type PricingMatchItem = {
  invoice_description?: string;
  invoice_unit_price?: number | string;
  expected_unit_price?: number | string;
  matched_pricing_description?: string;
  reason?: string;
};

type PricingSummary = {
  checked_count?: number;
  matched_count?: number;
  mismatch_count?: number;
  unclear_count?: number;
};

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not found";
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "Not found";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  return String(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject<T extends Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  return {} as T;
}

function getInvoiceDetail(detail?: ExtractedDocumentData) {
  if (!detail) {
    return {
      vendorName: "Not found",
      invoiceDate: "Not found",
      invoiceTotal: "Not found",
      preview: "No preview available.",
      extractionMethod: "Not found",
      textQuality: "Not found",
      sourceName: "Not found",
    };
  }

  return {
    vendorName: formatValue(detail.key_fields?.vendor_name),
    invoiceDate: formatValue(detail.key_fields?.invoice_date),
    invoiceTotal: formatValue(detail.key_fields?.invoice_total),
    preview: detail.raw_text_preview || "No preview available.",
    extractionMethod: formatValue(detail.extraction_method),
    textQuality: `${detail.text_quality_score}%`,
    sourceName: formatValue(detail.source_name),
  };
}

function getStageTone(status: ApprovalStatus) {
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

function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 20,
        padding: 20,
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  status,
}: {
  eyebrow: string;
  title: string;
  status?: ApprovalStatus;
}) {
  return (
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
          {eyebrow}
        </div>
        <h3 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>{title}</h3>
      </div>

      {status ? <StatusBadge status={status} /> : null}
    </div>
  );
}

function InfoBlock({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: unknown;
  tone?: "default" | "blue" | "green" | "amber" | "red";
}) {
  const toneStyles: Record<string, React.CSSProperties> = {
    default: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
    },
    blue: {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
    },
    green: {
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
    },
    amber: {
      background: "#fffbeb",
      border: "1px solid #fde68a",
    },
    red: {
      background: "#fef2f2",
      border: "1px solid #fecaca",
    },
  };

  const labelColor: Record<string, string> = {
    default: "#64748b",
    blue: "#1d4ed8",
    green: "#166534",
    amber: "#92400e",
    red: "#991b1b",
  };

  return (
    <div
      style={{
        ...toneStyles[tone],
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: labelColor[tone],
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
        {formatValue(value)}
      </div>
    </div>
  );
}

function TextPanel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
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
        {title}
      </div>
      <p style={{ margin: 0, lineHeight: 1.75, color: "#334155" }}>{text}</p>
    </div>
  );
}

function ListPanel({
  title,
  items,
  emptyText,
  tone = "default",
}: {
  title: string;
  items: string[];
  emptyText: string;
  tone?: "default" | "amber" | "green";
}) {
  const stylesByTone: Record<string, React.CSSProperties> = {
    default: {
      background: "#f8fafc",
      border: "1px solid #e2e8f0",
      color: "#334155",
      heading: "#475569",
      empty: "#64748b",
    },
    amber: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      color: "#7c2d12",
      heading: "#9a3412",
      empty: "#9a3412",
    },
    green: {
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
      color: "#166534",
      heading: "#166534",
      empty: "#166534",
    },
  };

  const current = stylesByTone[tone] as React.CSSProperties & {
    heading: string;
    empty: string;
  };

  return (
    <div
      style={{
        background: current.background,
        border: current.border,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: current.heading,
          textTransform: "uppercase",
          letterSpacing: 0.3,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      {items.length > 0 ? (
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: current.color,
            lineHeight: 1.7,
          }}
        >
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, color: current.empty, lineHeight: 1.7 }}>
          {emptyText}
        </p>
      )}
    </div>
  );
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
    <Card>
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
        <InfoBlock label="Vendor name" value={invoice.vendorName} />
        <InfoBlock label="Date" value={invoice.invoiceDate} />
        <InfoBlock label="Total price" value={invoice.invoiceTotal} />
        <InfoBlock label="Extraction method" value={invoice.extractionMethod} />
        <InfoBlock label="Text quality" value={invoice.textQuality} />
        <InfoBlock label="Source file" value={invoice.sourceName} />
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
    </Card>
  );
}

function CalculationDetails({ stage }: { stage?: StageResult }) {
  if (!stage) {
    return null;
  }

  const data = asObject<Record<string, unknown>>(stage.extracted_data);
  const aiCalculatedTotal = data.ai_calculated_total;
  const invoiceTotalFound = data.invoice_total_found;

  return (
    <Card>
      <SectionHeading
        eyebrow="Detailed review"
        title="Calculation check"
        status={stage.status}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <InfoBlock
          label="AI calculated total"
          value={aiCalculatedTotal}
          tone="blue"
        />
        <InfoBlock
          label="Invoice total"
          value={invoiceTotalFound}
          tone="default"
        />
        <InfoBlock label="Confidence" value={`${stage.confidence}%`} />
        <InfoBlock label="LLM used" value={stage.llm_used ? "Yes" : "No"} />
      </div>

      <TextPanel title="Explanation" text={stage.explanation} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        <ListPanel
          title="Issues found"
          items={stage.issues_found}
          emptyText="No meaningful issues found."
          tone="amber"
        />

        <ListPanel
          title="Warnings"
          items={stage.warnings}
          emptyText="No warnings returned."
          tone="default"
        />
      </div>
    </Card>
  );
}


function TicketDetails({ stage }: { stage?: StageResult }) {
  if (!stage) {
    return null;
  }

  const data =
    stage.extracted_data && typeof stage.extracted_data === "object"
      ? (stage.extracted_data as Record<string, unknown>)
      : {};

  const missingItems = Array.isArray(data.missing_from_tickets)
    ? (data.missing_from_tickets as Array<Record<string, unknown>>)
    : [];

  const uncertainItems = Array.isArray(data.uncertain_matches)
    ? (data.uncertain_matches as Array<Record<string, unknown>>)
    : [];

  const explicitWrongTicket =
    data.wrong_ticket === true ||
    data.ticket_identifier_matched === false ||
    data.pick_ticket_matched === false;

  const hasProblems =
    explicitWrongTicket ||
    missingItems.length > 0 ||
    uncertainItems.length > 0 ||
    stage.issues_found.length > 0;

  let rightTicketLabel: "Yes" | "Wrong ticket(s)" | "Needs review";
  let approvalResult: "Approved" | "Needs Review" | "Not Approved";

  if (explicitWrongTicket) {
    rightTicketLabel = "Wrong ticket(s)";
    approvalResult = "Not Approved";
  } else if (stage.status === "Approved") {
    rightTicketLabel = "Yes";
    approvalResult = "Approved";
  } else if (stage.status === "Partially Approved") {
    rightTicketLabel = "Yes";
    approvalResult = "Needs Review";
  } else if (stage.status === "Requires Human Review") {
    rightTicketLabel = "Needs review";
    approvalResult = "Needs Review";
  } else {
    rightTicketLabel = "Wrong ticket(s)";
    approvalResult = "Not Approved";
  }

  const rightTicketTone =
    rightTicketLabel === "Yes"
      ? "green"
      : rightTicketLabel === "Wrong ticket(s)"
        ? "red"
        : "amber";

  const approvalTone =
    approvalResult === "Approved"
      ? "green"
      : approvalResult === "Not Approved"
        ? "red"
        : "amber";

  const problemLines: string[] = [];

  if (explicitWrongTicket) {
    problemLines.push("The uploaded ticket does not appear to be the correct ticket for this invoice.");
  }

  stage.issues_found.forEach((issue) => {
    problemLines.push(issue);
  });

  missingItems.forEach((item) => {
    problemLines.push(
      `Invoice item not supported by ticket: ${String(item.invoice_description ?? "Unknown item")}`
    );
  });

  uncertainItems.forEach((item) => {
    const invoiceItem = String(item.invoice_description ?? "Unknown item");
    const possibleTicket = item.matched_ticket_description
      ? ` Possible ticket item: ${String(item.matched_ticket_description)}.`
      : "";
    problemLines.push(`Unclear support for ${invoiceItem}.${possibleTicket}`);
  });

  const cleanProblemLines = Array.from(new Set(problemLines));

  return (
    <Card>
      <SectionHeading
        eyebrow="Detailed review"
        title="Ticket match check"
        status={stage.status}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <InfoBlock
          label="Right ticket for this invoice"
          value={rightTicketLabel}
          tone={rightTicketTone as "green" | "amber" | "red"}
        />

        <InfoBlock
          label="Ticket approval result"
          value={approvalResult}
          tone={approvalTone as "green" | "amber" | "red"}
        />
      </div>

      <TextPanel
        title={stage.llm_used ? "Explanation (AI-assisted)" : "Explanation"}
        text={stage.explanation}
      />

      {cleanProblemLines.length > 0 ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#991b1b",
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
            }}
          >
            Problems found
          </div>

          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: "#7f1d1d",
              lineHeight: 1.7,
            }}
          >
            {cleanProblemLines.map((item, index) => (
              <li key={`ticket-problem-${index}`}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: "#166534",
              textTransform: "uppercase",
              letterSpacing: 0.3,
              marginBottom: 8,
            }}
          >
            Result
          </div>
          <p style={{ margin: 0, color: "#166534", lineHeight: 1.7 }}>
            The uploaded ticket matches the invoice and no ticket support problems were found.
          </p>
        </div>
      )}
    </Card>
  );
}

function PricingDetails({ stage }: { stage?: StageResult }) {
  if (!stage) {
    return null;
  }

  const data = asObject<Record<string, unknown>>(stage.extracted_data);
  const matchedItems = asArray<PricingMatchItem>(data.matches);
  const mismatches = asArray<PricingMatchItem>(data.mismatches);
  const unclearItems = asArray<PricingMatchItem>(data.unclear_cases);
  const summary = asObject<PricingSummary>(data.pricing_summary);

  return (
    <Card>
      <SectionHeading
        eyebrow="Detailed review"
        title="Pricing breakdown check"
        status={stage.status}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <InfoBlock
          label="Checked items"
          value={summary.checked_count}
          tone="default"
        />
        <InfoBlock
          label="Price matches"
          value={summary.matched_count}
          tone="green"
        />
        <InfoBlock
          label="Price mismatches"
          value={summary.mismatch_count}
          tone="red"
        />
        <InfoBlock
          label="Unclear cases"
          value={summary.unclear_count}
          tone="amber"
        />
        <InfoBlock label="Confidence" value={`${stage.confidence}%`} />
        <InfoBlock label="LLM used" value={stage.llm_used ? "Yes" : "No"} />
      </div>

      <TextPanel title="Explanation" text={stage.explanation} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <ListPanel
          title="Matched prices"
          items={matchedItems.map(
            (item) =>
              `${formatValue(item.invoice_description)} → invoice: ${formatValue(item.invoice_unit_price)}, expected: ${formatValue(item.expected_unit_price)}`
          )}
          emptyText="No confirmed price matches found."
          tone="green"
        />

        <ListPanel
          title="Price mismatches"
          items={mismatches.map(
            (item) =>
              `${formatValue(item.invoice_description)} → invoice: ${formatValue(item.invoice_unit_price)}, expected: ${formatValue(item.expected_unit_price)}`
          )}
          emptyText="No price mismatches found."
          tone="amber"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        <ListPanel
          title="Warnings"
          items={
            stage.warnings.length > 0
              ? stage.warnings
              : unclearItems.map(
                  (item) =>
                    `${formatValue(item.invoice_description)} → ${formatValue(item.reason)}`
                )
          }
          emptyText="No warnings returned."
          tone="default"
        />

        <ListPanel
          title="Issues found"
          items={stage.issues_found}
          emptyText="No meaningful issues found."
          tone="amber"
        />
      </div>
    </Card>
  );
}

export function ResultsPanel({ result }: { result: ApprovalResponse }) {
  const invoiceDetail = result.extraction_details.find(
    (detail) => detail.key_fields?.document_type === "invoice"
  );

  const calculationStage = result.stages.find(
    (stage) => stage.name === "Calculation Check"
  );
  const ticketStage = result.stages.find(
    (stage) => stage.name === "Ticket Match Check"
  );
  const pricingStage = result.stages.find(
    (stage) => stage.name === "Pricing Breakdown Check"
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
      <Card>
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
            <h2 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>
              Invoice review result
            </h2>
            <p
              style={{
                margin: "8px 0 0 0",
                color: "#475569",
                lineHeight: 1.7,
              }}
            >
              {result.overall_explanation || result.overall_summary}
            </p>
          </div>

          <StatusBadge status={result.overall_status} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
            marginBottom: 14,
          }}
        >
          {calculationStage ? (
            <StageSummaryCard stage={calculationStage} />
          ) : null}
          {ticketStage ? <StageSummaryCard stage={ticketStage} /> : null}
          {pricingStage ? <StageSummaryCard stage={pricingStage} /> : null}
        </div>

        <div
          style={{
            fontSize: 14,
            color: "#64748b",
            lineHeight: 1.7,
          }}
        >
          <strong style={{ color: "#334155" }}>Invoice file:</strong>{" "}
          {result.invoice_filename}
        </div>
      </Card>

      <InvoicePreview detail={invoiceDetail} />

      <CalculationDetails stage={calculationStage} />
      <TicketDetails stage={ticketStage} />
      <PricingDetails stage={pricingStage} />
    </div>
  );
}