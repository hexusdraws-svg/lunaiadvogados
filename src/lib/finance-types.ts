export type FeeNoteStatus = "rascunho" | "enviado" | "aceite" | "recusado" | "expirado" | "arquivado";
export type InvoiceStatus = "pendente" | "parcial" | "pago" | "cancelado";
export type PaymentMethod = "dinheiro" | "transferencia" | "pos" | "cheque" | "mpesa" | "emola" | "banco" | "outro";
export type FeeNoteDocumentType = "budget" | "invoice";

export interface FeeNote {
  id?: string;
  company_id?: string;
  cliente_id?: string | null;
  processo_id?: string | null;
  numero?: string;
  issue_date?: string;
  valid_until?: string | null;
  due_date?: string | null;
  status?: FeeNoteStatus | InvoiceStatus;
  document_type?: FeeNoteDocumentType | null;
  source_fee_note_id?: string | null;
  observations?: string | null;
  services?: any[];
  subtotal?: number;
  tax?: number;
  total?: number;
  paid_amount?: number;
  balance?: number;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Invoice {
  id?: string;
  company_id?: string;
  cliente_id?: string | null;
  processo_id?: string | null;
  fee_note_id?: string | null;
  numero?: string;
  issue_date?: string;
  due_date?: string | null;
  status?: InvoiceStatus;
  services?: any[];
  subtotal?: number;
  tax?: number;
  total?: number;
  paid_amount?: number;
  balance?: number;
  observations?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Receipt {
  id?: string;
  company_id?: string;
  fee_note_id: string;
  transaction_id: string;
  receipt_number: string;
  amount: number;
  payment_method: PaymentMethod;
  receipt_date?: string;
  description?: string | null;
  pdf_url?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}