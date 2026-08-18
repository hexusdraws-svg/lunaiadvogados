-- Migration: 20260813_allow_users_insert_own_notifications.sql
-- Permite que utilizadores comuns insiram notificacoes para si mesmos.

DROP POLICY IF EXISTS "notifications user insert own" ON public.notifications;
CREATE POLICY "notifications user insert own"
  ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
