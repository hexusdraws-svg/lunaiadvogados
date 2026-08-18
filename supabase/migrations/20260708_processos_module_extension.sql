-- Reconstrução do módulo Processos: extensão de colunas
-- processos: etiquetas (tags) + observacoes_gerais
-- processo_etapas: responsavel_id + checklist (jsonb)

ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS etiquetas text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS observacoes_gerais text;

ALTER TABLE public.processo_documentos
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'Outro';

ALTER TABLE public.processo_etapas
  ADD COLUMN IF NOT EXISTS responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.processos.etiquetas IS 'Etiquetas/tags do processo';
COMMENT ON COLUMN public.processos.observacoes_gerais IS 'Observações gerais do processo';
COMMENT ON COLUMN public.processo_etapas.responsavel_id IS 'Profissional responsável pela etapa';
COMMENT ON COLUMN public.processo_etapas.checklist IS 'Checklist da etapa (jsonb array de {id, texto, concluido})';

CREATE INDEX IF NOT EXISTS idx_processos_etiquetas ON public.processos USING GIN (etiquetas);
