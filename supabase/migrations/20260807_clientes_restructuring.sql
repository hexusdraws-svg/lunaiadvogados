-- Reestruturação do cadastro de clientes
-- Adiciona colunas faltantes e separa bairro de provincia

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS data_nascimento TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS profissao TEXT,
  ADD COLUMN IF NOT EXISTS naturalidade TEXT,
  ADD COLUMN IF NOT EXISTS data_validade TEXT;

COMMENT ON COLUMN public.clientes.bairro IS 'Bairro do cliente';
COMMENT ON COLUMN public.clientes.data_nascimento IS 'Data de nascimento (texto livre)';
COMMENT ON COLUMN public.clientes.estado_civil IS 'Estado civil do cliente';
COMMENT ON COLUMN public.clientes.profissao IS 'Profissão do cliente';
COMMENT ON COLUMN public.clientes.naturalidade IS 'Naturalidade do cliente';
COMMENT ON COLUMN public.clientes.data_validade IS 'Data de validade do documento de identificação';
