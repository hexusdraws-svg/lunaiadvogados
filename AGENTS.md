# AGENTS.md - Kilo Agent Task Tracking

## Task: Restore original Super Admin architecture (separate from company) (2026-07-18)

### Problem
Super Admin was treated like a normal admin: shared `AppSidebar`, landed on the
company dashboard (`/`), and `admin.painel-executivo` used the company sidebar.

### Fix — fully separate Super Admin architecture
- New `/super-admin/*` route section, each page wrapped in `SuperAdminOnly` and
  rendered with `SuperAdminSidebar` (separate shell, never loads company data:
  no processos, clientes, contratos, audiências, agenda, financeiro, dashboard).
- `use-super-admin-dashboard.ts`: global aggregation across ALL companies (no
  company_id filter), exclusive to the Super Admin.
- `super-admin.index.tsx` — Dashboard Geral (Total Empresas, Ativas, Suspensas,
  Total Advogados, Total Clientes, Total Processos, Total Audiências, Total
  Contratos, Receita estimada).
- `super-admin.empresas.tsx` — lista todas as empresas (Nome, Administrador,
  Plano, Tipo, Clientes, Processos, Profissionais, Audiências, Último Login,
  Estado, Dias licença); ações Ver detalhes / Suspender / Reativar / Eliminar.
- `super-admin.empresas.$companyId.tsx` — todos os dados + botões Editar,
  Suspender, Eliminar, Enviar alerta de licença, Ver estatísticas.
- `super-admin.empresas.nova.tsx` — Criar Empresa (com `company_type`).
- `super-admin.licencas.tsx` — Licenças (criar + listar alertas).
- `super-admin.estatisticas.tsx` — Estatísticas Gerais (global ou por empresa).
- `super-admin.alertas.tsx` — Alertas (histórico de notificações).
- `super-admin.configuracoes.tsx` — Configurações Globais.
- `SuperAdminRedirect` in `protected-route.tsx`: super admin aceder a `/` (e
  `admin.painel-executivo`) é redirecionado para `/super-admin`. O Super Admin
  NUNCA entra no dashboard de uma empresa.
- `SuperAdminSidebar` reescrito para apontar apenas às rotas `/super-admin/*`.

### Constraints respected
- Sem alterar autenticação, RLS, `companies`, `profiles`.
- Super Admin continua sem `company_id` (lógica existente mantida).

---

## Task: Contract live variables + company_type + Super Admin panel + license alerts (2026-07-18)

### Summary of changes (estruturais, sem quebrar módulos existentes)

- PARTE 1-5 (Contratos): variáveis do cliente agora inserem o VALOR REAL ao vivo
  no cursor; painel informativo (Cliente / Tipo Documento / Processo) acima do
  editor; novas variáveis do cliente; sem variável para "Tipo Documento"; cursor
  e scroll preservados ao inserir (usa insertContent, não setContent).
- PARTE 6-8: coluna `companies.company_type` (office|freelancer); edição no painel
  Super Admin; divisão de honorários só para freelancers (office = receita da
  empresa). A lógica consulta sempre `company.company_type` (nunca roles).
- PARTE 9-10: painel Super Admin de empresas com métricas e ações (ver detalhes,
  suspender, reativar, eliminar). Eliminar usa `delete_company_cascade`.
- PARTE 11-15: tabela `company_license_alerts`; Super Admin cria alertas; banner
  vermelho fixo com contagem regressiva em todas as páginas; notificação no sino
  (tabela `notifications`) para histórico.

### Migrations criadas

- `supabase/migrations/20260718_company_type_and_license_alerts.sql`

---


## Task: Financial Module Refactoring + Internationalization + Route Recovery

### Completed Work

#### Route Recovery (Critical - Files were accidentally deleted)

- Recreated `src/routes/__root.tsx` - Root route layout with all providers
- Recreated `src/routes/index.tsx` - Dashboard page
- Recreated `src/routes/login.tsx` - Login page with language selector
- Recreated `src/routes/signup.tsx` - Register page with language selector
- Recreated `src/routes/empresa.tsx` - Company settings with internationalization fields
- Recreated `src/routes/processos.tsx` - Process list page
- Recreated `src/routes/financas.tsx` + sub-routes (`financas.recebimentos.tsx`, `financas.despesas.tsx`)
- Recreated `src/routes/admin.empresas.tsx` - Admin companies management
- Recreated `src/routes/admin.painel-executivo.tsx` - Admin executive panel
- Recreated stub pages: agenda.tsx, audiencias.tsx, automacao.tsx, configuracoes.tsx, perfil.tsx, modelos.tsx, lembretes.tsx, tarefas.tsx, leads.tsx, imoveis.tsx, follow-ups.tsx, contratos.historico.tsx, contratos.gerar.tsx, cadastros.clientes.tsx, cadastros.profissionais.tsx

#### Internationalization (i18n)

- Created `src/lib/i18n.ts` with translation keys for PT/EN
- Created `src/hooks/use-i18n.tsx` with:
  - Language context provider with localStorage persistence
  - Currency formatting based on company settings
  - Date format options (dd/MM/yyyy, MM/dd/yyyy, yyyy-MM-dd)
  - Timezone options
  - Payment methods query hook for company-specific methods
- Updated `src/routes/__root.tsx` to wrap with I18nProvider
- Updated `src/components/page-header.tsx` with language selector in header
- Updated `src/routes/login.tsx` with language selector
- Updated `src/routes/signup.tsx` with language selector
- Created migration `supabase/migrations/20260704_company_internationalization.sql`:
  - Added `language`, `currency`, `timezone`, `date_format` to companies table
  - Created `company_payment_methods` table for configurable payment methods

#### Financial Transactions

- Fixed `status`/`transaction_type` mapping in `use-financial-transactions.ts`:
  - Added `statusToDb` and `statusToUi` mapping functions
  - Updated `useCreateTransaction` to map UI status ("aberto"/"recebido") to DB status ("pending"/"paid")
  - Updated `useFinancialReceitas` and `useFinancialDespesas` to normalize status on read
  - Updated `useMarkAsReceived` and `useMarkAsPaid` to preserve existing payment_date
- Reorganized form in `financial-transactions-table.tsx`:
  - Changed Dialog width to max-w-3xl
  - Added lg:grid-cols-2 for responsive 2-column layout
- Updated `src/integrations/supabase/types.ts`:
  - Added language, currency, timezone, date_format to companies Row/Insert/Update
  - Added company_payment_methods table type
  - Added process_id to financial_transactions_d

#### Company Settings Page

- Updated `src/routes/empresa.tsx`:
  - Added internationalization section with language, currency, timezone, date format dropdowns

#### Company Admin Functions (Fixed Import Error)

- Added missing exports to `src/lib/company.ts`:
  - `createCompanyAndPendingProfile`
  - `fetchPendingAdminProfiles`, `suspendCompany`, `reactivateCompany`, `cancelCompany`
  - `CompanyStatus` type

### Files Modified

- `src/hooks/use-financial-transactions.ts`
- `src/hooks/use-i18n.tsx`
- `src/components/financial-transactions-table.tsx`
- `src/routes/__root.tsx`
- `src/components/page-header.tsx`
- `src/routes/login.tsx`
- `src/routes/signup.tsx`
- `src/routes/empresa.tsx`
- `src/lib/company.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20260704_company_internationalization.sql`

### Processos Module (Complete Rebuild)

- Extended `src/hooks/use-tarefas.ts`:
  - `useCreateProcesso` / `useUpdateProcesso` now persist all enhanced legal-case fields (tribunal, cidade, provincia, juiz, parte_contraria, advogado_parte_contraria, valor_causa, prioridade, ultima_movimentacao, proxima_audiencia, deadline_date). Previously these columns were silently dropped.
- Created `src/components/processo-form-dialog.tsx`:
  - Shared create/edit dialog with searchable client ComboBox (Command + Popover)
  - Single source of truth reused by list and detail pages (no duplicate code)
- Rewrote `src/routes/processos.tsx`:
  - Removed the broken duplicate `Route`/`ProcessosPage` exports (old mixed-state content)
  - Wired `ProcessoFormDialog`; added row actions: Visualizar, Editar, Duplicar, Arquivar, Excluir
- Rebuilt `src/routes/processos.$id.tsx` detail page with 9 tabs:
  - Resumo, Timeline, Audiências, Tarefas, Documentos, Contratos, Financeiro, Anotações, Histórico
  - Header with status quick-change + actions dropdown
  - Timeline aggregates creation, etapas, tarefas, audiências and historico
  - Audiências sourced from `hearings` table (case_id = processo.id)
  - Contratos sourced from `contracts` table (by cliente_nome)
  - Financeiro sourced from financial_transactions / financial_transactions_d (process_id = id)
  - Anotações CRUD via use-processo-notes (processo_historico)
- Added i18n keys `detail.tabs.stages` (pt/en)

### Blocked / Requires Manual Action

- **Vite dev server restart**: After `.env` changes, restart `npm run dev` so Vite picks up new env vars
- **Supabase migrations** need to be run via Supabase CLI (incl. `20260627_create_notifications.sql`, `20260629_process_invitations_and_notifications.sql`, `20260812_create_webhook_logs_table.sql`, `20260812_agenda_reminder_fields.sql`)
  ```bash
  supabase db push
  ```
- **Supabase Storage bucket `processo-documentos`** must exist for document upload (used by processos docs); `attachments` bucket still required for financial uploads
- **N8N CORS**: the webhook endpoint must be configured to allow cross-origin requests from the frontend. See: [N8N CORS](#n8n-cors-configuration)

### Next Steps

- Update payment methods in financial form to use company-specific methods
- Run pending migrations (see above)
- Configure CORS on N8N (see below)
- Optionally create `processo-documentos` storage bucket

### N8N CORS Configuration

The N8N webhook endpoint does not return CORS headers, which means browser `fetch` calls are blocked. Options:

1. **N8N Cloud**: Check N8N settings for a CORS/Webhook CORS configuration panel and add origins `http://localhost:8080` and your production domain.

2. **Cloudflare Workers proxy** (recommended if N8N Cloud doesn't support CORS):
   ```typescript
   // cloudflare-worker.js
   addEventListener('fetch', event => {
     event.respondWith(handleRequest(event.request))
   })
   async function handleRequest(request) {
     const response = await fetch('https://lunaiadvocacia.app.n8n.cloud/webhook-test/advocacia', {
       method: request.method,
       headers: { 'Content-Type': 'application/json' },
       body: request.method !== 'OPTIONS' ? request.body : null,
     })
     const newResponse = new Response(response.body, response)
     newResponse.headers.set('Access-Control-Allow-Origin', '*')
     newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type')
     newResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
     if (request.method === 'OPTIONS') {
       return new Response(null, { status: 204, headers: newResponse.headers })
     }
     return newResponse
   }
   ```
   Then set `VITE_N8N_WEBHOOK_URL` to the Cloudflare Worker URL.
