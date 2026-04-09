import { ApprovalStatus } from '@/lib/types';

const statusClassMap: Record<ApprovalStatus, string> = {
  Approved: 'status approved',
  'Partially Approved': 'status partial',
  'Requires Human Review': 'status review',
  'Not Approved': 'status rejected',
};

export function StatusBadge({ status }: { status: ApprovalStatus }) {
  return <span className={statusClassMap[status]}>{status}</span>;
}
