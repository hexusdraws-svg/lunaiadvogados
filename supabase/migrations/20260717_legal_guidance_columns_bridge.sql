-- Migration: 20260717_legal_guidance_columns_bridge.sql
-- Bridge entre os nomes de colunas enviados pelo n8n e o esquema da tabela.
-- O n8n escreve em: legal_guidance, strategy, generated_at
-- A tabela original tinha: summary, recommended_strategy, created_at
-- Esta migration adiciona as colunas do n8n (idempotente) e mantém as antigas,
-- garantindo que os dados inseridos pelo n8n passem a persistir e serem lidos.

ALTER TABLE public.legal_guidance
  ADD COLUMN IF NOT EXISTS legal_guidance text;

ALTER TABLE public.legal_guidance
  ADD COLUMN IF NOT EXISTS strategy text;

ALTER TABLE public.legal_guidance
  ADD COLUMN IF NOT EXISTS generated_at timestamptz;

COMMENT ON COLUMN public.legal_guidance.legal_guidance IS 'Texto principal da orientação jurídica (enviado pelo n8n)';
COMMENT ON COLUMN public.legal_guidance.strategy IS 'Estratégia recomendada (enviado pelo n8n)';
COMMENT ON COLUMN public.legal_guidance.generated_at IS 'Data/hora em que a IA gerou a orientação (enviado pelo n8n)';

-- Back-fill: se o n8n já tiver escrito numa coluna mas a canónica estiver vazia, copia.
UPDATE public.legal_guidance
SET summary = COALESCE(summary, legal_guidance)
WHERE summary IS NULL AND legal_guidance IS NOT NULL;

UPDATE public.legal_guidance
SET recommended_strategy = COALESCE(recommended_strategy, strategy)
WHERE recommended_strategy IS NULL AND strategy IS NOT NULL;

UPDATE public.legal_guidance
SET created_at = COALESCE(created_at, generated_at)
WHERE created_at IS NULL AND generated_at IS NOT NULL;

-- Garante que o status reflete "completed" quando houver conteúdo mas status em branco/processing.
UPDATE public.legal_guidance
SET status = 'completed'
WHERE status IS NULL OR status = 'processing'
  AND (legal_guidance IS NOT NULL OR summary IS NOT NULL);
