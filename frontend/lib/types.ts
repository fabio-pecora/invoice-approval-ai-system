export type ApprovalStatus =
  | 'Approved'
  | 'Partially Approved'
  | 'Requires Human Review'
  | 'Not Approved';

export type StageResult = {
  name: 'Calculation Check' | 'Ticket Match Check' | 'Pricing Breakdown Check';
  status: ApprovalStatus;
  confidence: number;
  summary: string;
  explanation: string;
  issues_found: string[];
  warnings: string[];
  extracted_data: Record<string, unknown>;
  llm_used: boolean;
};

export type ExtractedDocumentData = {
  source_name: string;
  extraction_method: 'text' | 'ocr' | 'text+ocr';
  text_quality_score: number;
  key_fields: Record<string, unknown>;
  raw_text_preview: string;
};

export type ApprovalResponse = {
  overall_status: ApprovalStatus;
  overall_summary: string;
  overall_explanation: string;
  invoice_filename: string;
  stages: StageResult[];
  extraction_details: ExtractedDocumentData[];
};
