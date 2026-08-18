-- Migration: 20260812_drop_obsolete_money_paid_and_debt.sql
-- Remove colunas obsoletas money_paid e debt de fee_notes
-- após confirmação que nenhum código ou trigger depende delas.

ALTER TABLE public.fee_notes
  DROP COLUMN IF EXISTS money_paid,
  DROP COLUMN IF EXISTS debt;
