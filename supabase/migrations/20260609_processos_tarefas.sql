-- Legal CRM: Processos and Tarefas
-- Migration: 20260609_processos_tarefas.sql

-- 1. PROCESSOS (legal cases)
CREATE TABLE public.processos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  numero text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome text,
  tipo text NOT NULL DEFAULT 'outro',
  status text NOT NULL DEFAULT 'em_andamento',
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read processos" ON public.processos FOR SELECT USING (true);
CREATE POLICY "public write processos" ON public.processos FOR INSERT WITH CHECK (true);
CREATE POLICY "public update processos" ON public.processos FOR UPDATE USING (true);
CREATE POLICY "public delete processos" ON public.processos FOR DELETE USING (true);

CREATE INDEX idx_processos_company ON public.processos(company_id);
CREATE INDEX idx_processos_cliente ON public.processos(cliente_id);

-- Sequence helper for processo numero (per company per year)
CREATE OR REPLACE FUNCTION public.next_processo_number(_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _year int := EXTRACT(year FROM now())::int;
  _count int;
BEGIN
  SELECT COUNT(*) + 1 INTO _count
  FROM public.processos
  WHERE company_id = _company_id
    AND EXTRACT(year FROM created_at)::int = _year;
  RETURN 'PROC-' || _year || '-' || LPAD(_count::text, 4, '0');
END;
$$;


-- 2. TAREFAS (tasks)
CREATE TABLE public.tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  task_date date NOT NULL,
  reminder_date date NOT NULL,
  reminder_time text NOT NULL DEFAULT '',
  task_time text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read tarefas" ON public.tarefas FOR SELECT USING (true);
CREATE POLICY "public write tarefas" ON public.tarefas FOR INSERT WITH CHECK (true);
CREATE POLICY "public update tarefas" ON public.tarefas FOR UPDATE USING (true);
CREATE POLICY "public delete tarefas" ON public.tarefas FOR DELETE USING (true);

CREATE INDEX idx_tarefas_company ON public.tarefas(company_id);
CREATE INDEX idx_tarefas_processo ON public.tarefas(processo_id);
CREATE INDEX idx_tarefas_client ON public.tarefas(client_id);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
