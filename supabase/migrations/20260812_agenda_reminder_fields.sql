-- Migration: 20260812_agenda_reminder_fields.sql
-- Adds reminder_date and reminder_time columns to the agenda table
-- These fields are used by the N8N webhook for scheduling reminders.

ALTER TABLE public.agenda
  ADD COLUMN IF NOT EXISTS reminder_date date,
  ADD COLUMN IF NOT EXISTS reminder_time text;
