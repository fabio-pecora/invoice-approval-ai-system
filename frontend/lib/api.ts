import { ApprovalResponse } from '@/lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

export async function runApproval(input: {
  invoice: File;
  tickets: File[];
  pricingBreakdown: File | null;
}): Promise<ApprovalResponse> {
  const formData = new FormData();
  formData.append('invoice', input.invoice);
  input.tickets.forEach((ticket) => formData.append('tickets', ticket));
  if (input.pricingBreakdown) {
    formData.append('pricing_breakdown', input.pricingBreakdown);
  }

  const response = await fetch(`${API_BASE_URL}/approve`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: 'Unknown server error' }));
    throw new Error(body.detail || 'Approval request failed');
  }

  return response.json();
}
