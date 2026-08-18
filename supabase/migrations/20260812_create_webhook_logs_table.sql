-- Migration: 20260812_create_webhook_logs_table.sql
-- Cria a tabela webhook_logs para registrar o histórico de webhooks enviados

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payload jsonb DEFAULT '{}'::jsonb,
  sent boolean NOT NULL DEFAULT false,
  status integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_company ON public.webhook_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user ON public.webhook_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event ON public.webhook_logs(event);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "webhook_logs company read" ON public.webhook_logs;
CREATE POLICY "webhook_logs company read" ON public.webhook_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.webhook_logs.company_id
        AND p.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "service_role full access webhook_logs" ON public.webhook_logs;
CREATE POLICY "service_role full access webhook_logs" ON public.webhook_logs
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.webhook_logs IS 'Histórico de Webhooks Enviados';
