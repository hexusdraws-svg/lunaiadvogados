export const WEBHOOKS = {
  N8N: import.meta.env.VITE_N8N_WEBHOOK_URL,
} as const;

export type WebhookKey = keyof typeof WEBHOOKS;
