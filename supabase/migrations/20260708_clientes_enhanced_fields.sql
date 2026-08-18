-- Extend the existing clientes table with the fields required by the
-- professional client-management module. No new tables are created; the
-- structure of the existing "clientes" table is extended in place.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_documento TEXT,
  ADD COLUMN IF NOT EXISTS local_emissao TEXT,
  ADD COLUMN IF NOT EXISTS data_emissao TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS provincia TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT,
  ADD COLUMN IF NOT EXISTS observacoes TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.clientes.tipo_documento IS 'Tipo de documento (BI, Passaporte, DIRE, Outro)';
COMMENT ON COLUMN public.clientes.cidade IS 'Cidade do cliente';
COMMENT ON COLUMN public.clientes.provincia IS 'Província do cliente';
COMMENT ON COLUMN public.clientes.pais IS 'País do cliente';
COMMENT ON COLUMN public.clientes.observacoes IS 'Observações livres';
COMMENT ON COLUMN public.clientes.empresa IS 'Empresa do cliente (quando aplicável)';
COMMENT ON COLUMN public.clientes.estado IS 'Estado do cliente: ativo, inativo, arquivado';
COMMENT ON COLUMN public.clientes.created_by IS 'Utilizador autenticado que criou o cliente (advogado responsável)';

CREATE INDEX IF NOT EXISTS idx_clientes_estado ON public.clientes(estado);
CREATE INDEX IF NOT EXISTS idx_clientes_created_by ON public.clientes(created_by);
CREATE INDEX IF NOT EXISTS idx_clientes_cidade ON public.clientes(cidade);
