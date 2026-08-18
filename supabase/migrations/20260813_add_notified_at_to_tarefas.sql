-- Migration: 20260813_add_notified_at_to_tarefas.sql
-- Adiciona coluna para controlar se a tarefa ja gerou notificacao de vencimento.

ALTER TABLE public.tarefas ADD COLUMN IF NOT EXISTS notified_at timestamptz;

COMMENT ON COLUMN public.tarefas.notified_at IS 'Data/hora em que foi gerada notificacao de vencimento para esta tarefa';
