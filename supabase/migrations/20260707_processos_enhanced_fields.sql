-- Enhance processos table with additional legal case fields

ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS tribunal text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS juiz text,
  ADD COLUMN IF NOT EXISTS parte_contraria text,
  ADD COLUMN IF NOT EXISTS advogado_parte_contraria text,
  ADD COLUMN IF NOT EXISTS valor_causa numeric,
  ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS ultima_movimentacao timestamptz,
  ADD COLUMN IF NOT EXISTS proxima_audiencia date,
  ADD COLUMN IF NOT EXISTS deadline_date date;

COMMENT ON COLUMN public.processos.tribunal IS 'Tribunal where the case is being processed';
COMMENT ON COLUMN public.processos.cidade IS 'City of the court';
COMMENT ON COLUMN public.processos.provincia IS 'Province/State of the court';
COMMENT ON COLUMN public.processos.juiz IS 'Judge handling the case';
COMMENT ON COLUMN public.processos.parte_contraria IS 'Opposing party name';
COMMENT ON COLUMN public.processos.advogado_parte_contraria IS 'Opposing party lawyer';
COMMENT ON COLUMN public.processos.valor_causa IS 'Case value amount';
COMMENT ON COLUMN public.processos.prioridade IS 'Case priority: baixa, normal, alta, urgente';
COMMENT ON COLUMN public.processos.ultima_movimentacao IS 'Last movement/activity timestamp';
COMMENT ON COLUMN public.processos.proxima_audiencia IS 'Next hearing date';
COMMENT ON COLUMN public.processos.deadline_date IS 'Overall case deadline date';

CREATE INDEX IF NOT EXISTS idx_processos_prioridade ON public.processos(prioridade);
CREATE INDEX IF NOT EXISTS idx_processos_ultima_movimentacao ON public.processos(ultima_movimentacao);
CREATE INDEX IF NOT EXISTS idx_processos_proxima_audiencia ON public.processos(proxima_audiencia);
CREATE INDEX IF NOT EXISTS idx_processos_deadline_date ON public.processos(deadline_date);
