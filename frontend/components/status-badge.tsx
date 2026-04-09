import { ApprovalStatus } from "@/lib/types";

const styles: Record<ApprovalStatus, React.CSSProperties> = {
  Approved: {
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #bbf7d0",
  },
  "Partially Approved": {
    background: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
  },
  "Requires Human Review": {
    background: "#fef3c7",
    color: "#92400e",
    border: "1px solid #fde68a",
  },
  "Not Approved": {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fecaca",
  },
};

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span
      style={{
        ...styles[status],
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        padding: "7px 12px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.2,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
