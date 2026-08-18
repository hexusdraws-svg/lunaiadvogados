-- Migration: 20260627_create_notifications.sql
-- Objetivo: Criar tabela de notificações do sistema
-- Nota: Cada utilizador vê apenas as suas notificações, admin vê todas da empresa

-- =========================================================
-- 1. ENUM para tipos de notificação
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'error', 'success', 'reminder');
  END IF;
END $$;

-- =========================================================
-- 2. ENUM para tipos de entidade relacionada
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type') THEN
    CREATE TYPE public.entity_type AS ENUM ('case', 'hearing', 'task', 'document', 'client', 'user', 'system');
  END IF;
END $$;

-- =========================================================
-- 3. TABELA notifications
-- =========================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type public.notification_type NOT NULL DEFAULT 'info',
  entity_type public.entity_type,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT FALSE,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'Notificações do sistema para utilizadores';
COMMENT ON COLUMN public.notifications.user_id IS 'Utilizador destinatário da notificação';
COMMENT ON COLUMN public.notifications.type IS 'Tipo: info, warning, error, success, reminder';
COMMENT ON COLUMN public.notifications.entity_type IS 'Tipo da entidade relacionada (case, hearing, task, etc.)';
COMMENT ON COLUMN public.notifications.entity_id IS 'ID da entidade relacionada';
COMMENT ON COLUMN public.notifications.is_read IS 'Se a notificação foi lida';
COMMENT ON COLUMN public.notifications.read_at IS 'Data/hora de leitura';
COMMENT ON COLUMN public.notifications.metadata IS 'Dados adicionais em formato JSON';

-- =========================================================
-- 4. TRIGGER para updated_at automático
-- =========================================================
DROP TRIGGER IF EXISTS trg_notifications_updated_at ON public.notifications;
CREATE TRIGGER trg_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. ÍNDICES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- =========================================================
-- 6. ROW LEVEL SECURITY
-- =========================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Utilizador vê apenas as suas notificações
DROP POLICY IF EXISTS "notifications user read own" ON public.notifications;
CREATE POLICY "notifications user read own" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.notifications.company_id
    )
  );

-- Utilizador pode atualizar apenas as suas notificações (marcar como lida)
DROP POLICY IF EXISTS "notifications user update own" ON public.notifications;
CREATE POLICY "notifications user update own" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin pode inserir notificações para qualquer utilizador da empresa
DROP POLICY IF EXISTS "notifications admin insert company" ON public.notifications;
CREATE POLICY "notifications admin insert company" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.notifications.company_id
    )
  );

-- Utilizador não pode inserir notificações (apenas sistema/admin)
-- NÃO criar policy de INSERT para utilizadores comuns

-- Admin pode deletar notificações da empresa
DROP POLICY IF EXISTS "notifications admin delete company" ON public.notifications;
CREATE POLICY "notifications admin delete company" ON public.notifications
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p_admin
      WHERE p_admin.id = auth.uid()
        AND p_admin.role IN ('admin', 'super_admin')
        AND p_admin.company_id = public.notifications.company_id
    )
  );

-- Utilizador pode deletar apenas as suas próprias notificações
DROP POLICY IF EXISTS "notifications user delete own" ON public.notifications;
CREATE POLICY "notifications user delete own" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Service role: acesso total
DROP POLICY IF EXISTS "service_role full access notifications" ON public.notifications;
CREATE POLICY "service_role full access notifications" ON public.notifications
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
