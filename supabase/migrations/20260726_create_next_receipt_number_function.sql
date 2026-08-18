-- Migration: 20260726_create_next_receipt_number_function.sql
-- Recria a função next_receipt_number usada pela arquitetura de recibos.
-- Gera número sequencial por empresa no formato REC-YYYY-00001.

CREATE OR REPLACE FUNCTION public.next_receipt_number(p_company_id uuid)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT 'REC-' || to_char(now(),'YYYY') || '-' || lpad(coalesce(max(cast(split_part(numero,'-',3) as int)),0)+1, 5, '0')
  FROM public.receipts
  WHERE company_id = p_company_id
    AND numero ~ ('^REC-' || to_char(now(),'YYYY') || '-[0-9]{5}$');
$$;
