-- Migration: 20260713_contracts_processo_link.sql
-- Objetivo: Permitir associar contratos emitidos a Processos e Clientes.
-- IMPORTANTE: alteração puramente ADITIVA. Não remove nem altera colunas existentes.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS nome text,
  ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.contracts.nome IS 'Nome/título do contrato emitido';
COMMENT ON COLUMN public.contracts.cliente_id IS 'Cliente associado ao contrato (opcional, FK clientes)';
COMMENT ON COLUMN public.contracts.processo_id IS 'Processo associado ao contrato (opcional, FK processos)';

-- Índices para consultas por processo/cliente
CREATE INDEX IF NOT EXISTS idx_contracts_processo_id ON public.contracts(processo_id);
CREATE INDEX IF NOT EXISTS idx_contracts_cliente_id ON public.contracts(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON public.contracts(company_id);

-- Trigger para manter updated_at
CREATE OR REPLACE FUNCTION public.update_contracts_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contracts_updated_at ON public.contracts;
CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_contracts_updated_at();
