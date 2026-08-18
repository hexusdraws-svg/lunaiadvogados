-- Legal CRM: Process Stages and Documents
-- Migration: 20260611_process_stages.sql

-- 1. PROCESS STAGES (etapas)
CREATE TABLE public.process_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  reminder_date date,
  reminder_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.process_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read process_stages" ON public.process_stages FOR SELECT USING (true);
CREATE POLICY "public write process_stages" ON public.process_stages FOR INSERT WITH CHECK (true);
CREATE POLICY "public update process_stages" ON public.process_stages FOR UPDATE USING (true);
CREATE POLICY "public delete process_stages" ON public.process_stages FOR DELETE USING (true);

CREATE INDEX idx_process_stages_processo ON public.process_stages(processo_id);
CREATE INDEX idx_process_stages_status ON public.process_stages(status);

-- 2. STAGE DOCUMENTS (documentos de etapas)
CREATE TABLE public.stage_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.process_stages(id) ON DELETE CASCADE,
  filename text NOT NULL,
  url text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read stage_documents" ON public.stage_documents FOR SELECT USING (true);
CREATE POLICY "public write stage_documents" ON public.stage_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete stage_documents" ON public.stage_documents FOR DELETE USING (true);

CREATE INDEX idx_stage_documents_stage ON public.stage_documents(stage_id);

-- 3. PROCESS ACTIVITY LOG
CREATE TABLE public.process_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processo_id uuid NOT NULL REFERENCES public.processos(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES public.process_stages(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.process_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read process_activities" ON public.process_activities FOR SELECT USING (true);
CREATE POLICY "public write process_activities" ON public.process_activities FOR INSERT WITH CHECK (true);

CREATE INDEX idx_process_activities_processo ON public.process_activities(processo_id);
CREATE INDEX idx_process_activities_stage ON public.process_activities(stage_id);