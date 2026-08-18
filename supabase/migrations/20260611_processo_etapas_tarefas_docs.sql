-- Legal CRM: Processo Etapas, Tarefas Internas, Documentos e Historico
-- Migration: 20260611_processo_etapas_tarefas_docs.sql

-- =========================================================
-- 1. PROCESSO_ETAPAS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.processo_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  data_prevista date,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read processo_etapas" ON public.processo_etapas FOR SELECT USING (true);
CREATE POLICY "public write processo_etapas" ON public.processo_etapas FOR INSERT WITH CHECK (true);
CREATE POLICY "public update processo_etapas" ON public.processo_etapas FOR UPDATE USING (true);
CREATE POLICY "public delete processo_etapas" ON public.processo_etapas FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_processo_etapas_processo ON public.processo_etapas(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_etapas_status ON public.processo_etapas(status);

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trg_processo_etapas_updated_at ON public.processo_etapas;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_processo_etapas_updated_at
  BEFORE UPDATE ON public.processo_etapas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- 2. PROCESSO_TAREFAS (tarefas internas das etapas)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.processo_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  etapa_id uuid NOT NULL REFERENCES public.processo_etapas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  data_limite date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read processo_tarefas" ON public.processo_tarefas FOR SELECT USING (true);
CREATE POLICY "public write processo_tarefas" ON public.processo_tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY "public update processo_tarefas" ON public.processo_tarefas FOR UPDATE USING (true);
CREATE POLICY "public delete processo_tarefas" ON public.processo_tarefas FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_processo_tarefas_processo ON public.processo_tarefas(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_tarefas_etapa ON public.processo_tarefas(etapa_id);
CREATE INDEX IF NOT EXISTS idx_processo_tarefas_status ON public.processo_tarefas(status);

-- =========================================================
-- 3. PROCESSO_DOCUMENTOS (documentos anexados as etapas)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.processo_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  etapa_id uuid REFERENCES public.processo_etapas(id) ON DELETE SET NULL,
  nome_ficheiro text NOT NULL,
  arquivo_url text NOT NULL,
  tipo_ficheiro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read processo_documentos" ON public.processo_documentos FOR SELECT USING (true);
CREATE POLICY "public write processo_documentos" ON public.processo_documentos FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete processo_documentos" ON public.processo_documentos FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_processo_documentos_processo ON public.processo_documentos(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_documentos_etapa ON public.processo_documentos(etapa_id);

-- =========================================================
-- 4. PROCESSO_HISTORICO (log de eventos)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.processo_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  etapa_id uuid REFERENCES public.processo_etapas(id) ON DELETE SET NULL,
  tarefa_id uuid REFERENCES public.processo_tarefas(id) ON DELETE SET NULL,
  tipo text NOT NULL,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processo_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read processo_historico" ON public.processo_historico FOR SELECT USING (true);
CREATE POLICY "public write processo_historico" ON public.processo_historico FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_processo_historico_processo ON public.processo_historico(processo_id);
CREATE INDEX IF NOT EXISTS idx_processo_historico_etapa ON public.processo_historico(etapa_id);
CREATE INDEX IF NOT EXISTS idx_processo_historico_tarefa ON public.processo_historico(tarefa_id);
