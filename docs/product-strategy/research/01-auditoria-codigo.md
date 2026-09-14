# Apêndice de evidência — auditoria do código (Althion Education / `relatorio-ia`)

Data da leitura: 13/09/2026. Estado do repositório: `main` **4 commits à frente de `origin/main`** (e80540a, 26e7313, 8e7a573, d295a65 não enviados); `dist/` gerado em 11/09 20:45, ou seja, **o build de produção que existe no disco não contém E1 (financeiro) nem E6 (observações)**. Três arquivos não rastreados (`src/components/AuthorizationsTab.tsx`, `src/components/StudentCare.tsx`, `supabase/migrations/20260912120000_care.sql`) **quebram o `tsc -b` local** com 40 erros (`Module '"../data"' has no exported member 'listAuthorizations'`, `'getStudentHealth'`, `'Authorization'`, `'StudentHealth'`…): os componentes referenciam funções em `src/data/index.ts` e tipos em `src/types/db.ts` que **não existem**, e nenhuma página os importa. E7 hoje é migração + dois componentes órfãos.

Legenda de estado: **EXISTENTE** (funciona de ponta a ponta no código), **PARCIAL**, **DOCUMENTADO MAS NÃO IMPLEMENTADO**, **CÓDIGO MORTO**.

---

## 1. Arquitetura real

### 1.1 Stack e deploy
- Front: React 19.2 + Vite 8 + TypeScript 6 + Tailwind v4 (`@tailwindcss/vite`) + react-router-dom 7 + sonner (toasts) + lucide-react + framer-motion (`package.json`). Libs pesadas no bundle inicial: `xlsx`, `docx`, `html2pdf.js`, `@google/generative-ai`, `openai`, `stripe` (estes três últimos são dependências de servidor declaradas em `dependencies`, mas só `api/` os importa).
- Back: funções serverless em `api/**` (runtime Node da Vercel, `@vercel/node`), roteadas por `vercel.json:5-6`; SPA fallback em `vercel.json:6`; headers `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy` (`vercel.json:8-16`). Em dev, `scripts/vite-api-plugin.ts:31-92` serve `/api/*` dentro do `vite dev` carregando `.env` em `process.env` (`:35-38`).
- Banco: Supabase Postgres + Auth + Storage, projeto `axnfmsyfqlnsevucsiaz` (`docs/SETUP.md:9-13`). A auditoria anterior registra latência de "banco em us-west (~2-3 s)" (`docs/auditorias/2026-09-11-ux-produto.md`, S1) — ou seja, dados de crianças hospedados fora do Brasil, apesar do SETUP recomendar `sa-east-1`.
- PWA: `public/manifest.json` existe, mas o service worker foi **desativado de propósito** (`public/sw.js:1-4`; `index.html:22-30` desregistra SWs antigos). Não há offline.
- CI: `.github/workflows/ci.yml` roda `typecheck`, `lint`, `test`, `build` em push/PR na `main`. Passa no remoto (os arquivos WIP não estão commitados); **falha localmente** hoje.

### 1.2 Rotas do front (`src/App.tsx:39-64`) e quem acessa (`src/components/Layout.tsx:110-191`)

| Rota | Página | Perfil (menu) | Guarda de rota real |
|---|---|---|---|
| `/login`, `/redefinir-senha` | Login, ResetPassword | público | — |
| `/` | Home: professor (`Home.tsx:85-161`), responsável (`GuardianHome`, `:265-472`), direção/coordenação (`Management` + acompanhamento, `:180-261`) | todos | sessão |
| `/agenda` | Agenda | todos (flag `agenda`) | nenhuma |
| `/planning` | LessonPlanning | equipe (flag `planning`) | **nenhuma** (responsável chega por URL; RLS limita dados) |
| `/observations` | Observations | equipe | `Layout.tsx:191` |
| `/attendance`, `/lessons` | Attendance, Lessons | equipe | **nenhuma** |
| `/grades` | Grades | equipe não-infantil (flag `grades`) | **nenhuma** |
| `/bulletin` | Bulletin | equipe não-infantil + responsável com filho em turma numérica (flag `bulletin`) | nenhuma |
| `/diary` | ClassDiary | equipe | **nenhuma** |
| `/intelligence` | PedagogicalIntelligence | equipe (flag `pedagogical`) | **nenhuma** |
| `/transcript` | TranscriptGenerator | gestão (flag `transcript`) | `Layout.tsx:184-185` |
| `/reports`, `/pei` | ReportGenerator, PeiGenerator | equipe (flags `report`, `pei`) | **nenhuma** (o `/api/ai/generate` recusa guardian em `generate.ts:36`) |
| `/classes`, `/students`, `/users` | gestão | gestão | `Layout.tsx:184-185` |
| `/students/:id` | StudentProfile | não-guardian | `Layout.tsx:190` |
| `/settings` | Settings | admin | `Layout.tsx:186` |
| `/finance` | Finance | admin (flag `finance`) | `Layout.tsx:187` |
| `/family/finance` | FamilyFinance | guardian (flag `finance`) | `Layout.tsx:188` |
| `/admin` | PlatformAdmin | `platform_admins` | `Layout.tsx:189` |

Bloqueio por assinatura: `blockedWhenInactive` (`Layout.tsx:192`) libera só `/` e `/settings`.

### 1.3 Endpoints `/api`

| Rota | Método | Auth | O que faz |
|---|---|---|---|
| `/api/ai/generate` | POST | JWT + perfil ativo, recusa `guardian` (`api/ai/generate.ts:34-36`) | valida `feature ∈ {report,pei,pedagogical,planning}`, assinatura (`:19-26,51`), flag do plano + `feature_overrides` (`:55-63`), cota mensal contando linhas `ai_usage.ok=true` (`:65-76`), consentimento PEI (`:87-95`), monta prompt, chama provedor, grava `ai_usage` (`:113-135`), devolve `{content, model, promptVersion}` |
| `/api/admin/users` | POST | admin da escola (`requireSchoolAdmin`) | `create` (cria `auth.user` + `profiles` + vínculos guardian, respeita `plans.max_users`, devolve senha inicial uma vez, `api/admin/users.ts:49-100`), `reset_password`, `set_password`, `deactivate/activate` (ban 87600h, `:123-130`), `delete` |
| `/api/platform/schools` | GET/POST | `platform_admins` | GET lista escolas com 3 contagens **por escola** (N+1, `api/platform/schools.ts:58-65`); `create` (escola + ano letivo + admin, `:71-116`); `update` com whitelist `PATCHABLE` (`:38`); `usage` (90 dias, 500 linhas) |
| `/api/billing/checkout` | POST | admin | Stripe Checkout por `STRIPE_PRICES`; 501 sem chave (`api/billing/checkout.ts:17-18`) |
| `/api/billing/webhook` | POST | assinatura Stripe | mapeia eventos → `schools.status/plan_id` (`api/billing/webhook.ts:60-88`) |
| `/api/finance/asaas` | POST | admin | `connect` (valida chave com `GET /customers`, salva em `school_secrets`, gera token de webhook), `disconnect`, `status` |
| `/api/finance/charges` | POST | admin | `generate_month`, `issue`, `issue_many`, `cancel`, `sync` (`api/finance/charges.ts:10-16`) |
| `/api/finance/webhook?school=<id>` | POST | header `asaas-access-token` comparado com `school_secrets.asaas_webhook_token` (`api/finance/webhook.ts:18-24`) | idempotência por `finance_webhook_events.id` (`:30-33`), atualiza `invoices` |

RPCs Postgres chamadas do front: `my_ai_usage_this_month()` (`SchoolContext.tsx:97`), `finance_month_summary(year_id, month)` (`data/index.ts:462`).

### 1.4 Modelo de dados

Migração principal `supabase/migrations/20260911100000_saas_multi_tenant.sql` (791 linhas). Toda tabela de negócio tem `school_id` denormalizado (comentário `:7-10`).

Enums (`:29-36`): `user_role(admin, coordinator, teacher, guardian)`, `school_level(infantil, fundamental)`, `evaluation_type(numeric, report)`, `teacher_specialty(english, pe)`, `attendance_status(P, F)`, `school_status(trial, active, past_due, suspended, canceled)`, `document_status(draft, submitted, approved, returned)`, `document_kind(report, pei)`. Financeiro: `invoice_status`, `billing_type` (`20260912100000_finance.sql:9-10`). Cuidado (WIP): `incident_kind`, `authorization_kind`.

Tabelas em produção (aplicadas em 11/09 e 12/09 conforme memória/`SETUP.md`):
- `plans` (id texto, limites `max_students/max_users/ai_monthly_credits`, `features jsonb`, `price_cents`) — seed em `:788-795`: `trial` 60/10/40 tudo; `essencial` R$399 150/20/150 **sem** `pedagogical, grades, bulletin, transcript, finance`; `completo` R$799 400/60/500; `rede` ilimitado. `finance` adicionado em `finance.sql:141-142`.
- `schools` (slug, name, legal_name, cnpj, city, uf, authorization_text, `branding jsonb`, `grading_config jsonb`, plan_id, status, trial_ends_at, billing_customer_id, billing_subscription_id, `feature_overrides jsonb`, dpa_signed_at, `finance_config jsonb`).
- `platform_admins`, `profiles` (1 usuário = 1 escola, `role`, `managed_level`, `specialty`, `active`).
- `school_years` (label, active, closed, `periods jsonb` desde `observations_periods.sql:7`), `classes` (series, letter, level, evaluation_type, homeroom_teacher_id), `students` (name, birth_date, cpf, guardian1/2 texto, notes, `pei_consent_at/by`), `enrollments` (unique student+class, `evaluation_type_override`, `evaluation_note`), `student_guardians`, `teacher_assignments`.
- `attendance_records` (unique enrollment+date), `lesson_entries`, `grade_entries` (unique enrollment+subject+period+component; `period` 1–5).
- `student_documents` (kind, period, subject_id, author_id, `form_data jsonb`, `content text`, status, reviewed_by, review_note), `lesson_plans` (daily_plans jsonb, status, coordinator_feedback, ai_suggestions jsonb), `assessments` (+`analysis`, `analyzed_at`), `assessment_results`.
- `agenda_messages`, `agenda_message_reads`, `agenda_replies`, `agenda_events`.
- `ai_usage` (feature, provider, model, tokens, latency, ok, error — **sem conteúdo**).
- Financeiro: `school_secrets` (RLS ligada **sem policies**, `finance.sql:12-20`), `tuition_plans`, `student_billing` (pagador: nome, CPF/CNPJ, e-mail, telefone, `asaas_customer_id`), `invoices`, `finance_webhook_events`.
- `observations` (student, class, author, date, `field_id`, text, `photo_path`, `share_with_family`).
- **Não aplicada / não commitada**: `student_health`, `student_incidents`, `authorizations`, `authorization_responses` (`20260912120000_care.sql`).

Feature flags: resolvidas no front em `SchoolContext.tsx:153-163` (`override ?? fromPlan ?? (plan ? false : true)` — escola sem plano libera tudo) e no servidor só para IA (`generate.ts:55-63`). **`plans.max_students` não é imposto em lugar nenhum** (só exibido em `Settings.tsx:302`); `max_users` é imposto em `api/admin/users.ts:54-65`.

### 1.5 Multi-tenancy e RLS
`school_id` vem de `app.current_school_id()` (SECURITY DEFINER lendo `profiles`, `:434-437`); helpers `is_manager`, `is_admin`, `is_platform_admin`, `my_classes()` (regente/gestão/coordenação por segmento + `teacher_assignments`, `:456-466`), `my_students()` (`:469-472`). Todas as 22 tabelas com `enable row level security` (`:490-501`). Resumo por tabela: leitura da escola inteira para `profiles`, `school_years`, `agenda_replies`, `agenda_events`, `assessment_results`; leitura por turma para `classes`, `students`, `enrollments`, `attendance`, `lessons`, `grades`, `student_documents`, `lesson_plans`, `observations`; responsável só filhos + documentos `approved` + observações `share_with_family` + invoices não-draft.

**Pontos fracos concretos** (detalhados na seção 6): `profiles_update` permite ao usuário alterar o **próprio `role`** (`:530-533` — `with check` só confere `school_id`); `schools_update` permite ao admin da escola alterar `plan_id/status/trial_ends_at/feature_overrides` (`:519-522`); `student_documents_update` permite ao autor setar `status='approved'` (`:610-613`), idem `lesson_plans_update` (`:632-635`); `assessment_results_select/write` são escola-inteira, inclusive para guardian (`:659-664`); `profiles_select` expõe e-mail de toda a equipe e de todos os responsáveis a qualquer usuário da escola (`:525-526`); storage `observations_read` deixa qualquer autenticado da escola listar/assinar fotos de qualquer criança da escola (`observations_periods.sql:71-73`).

### 1.6 Autenticação
Supabase Auth e-mail+senha (`AuthContext.tsx:69-78`). Criação de usuário só pelo servidor com senha inicial gerada e exibida uma vez (`UserManagement.tsx:177-194`, `PlatformAdmin.tsx:106-119`); **não existe convite por e-mail** (grep `inviteUserByEmail` = 0). Reset: pelo Login (`Login.tsx:44-46`, redireciona para `/redefinir-senha`) e pelo admin (`api/admin/users.ts:112`, redireciona para **`/login`** — o `Login.tsx:24` manda sessão logada para `/`, então o link de recuperação disparado pela direção **não abre o formulário de nova senha**; bug de fluxo). Desativar = `ban_duration: '87600h'`. Primeiro admin da plataforma: SQL manual (`docs/SETUP.md:41-46`).

### 1.7 Storage
Bucket `branding` público, 2 MB, escrita admin em `<school_id>/` (`branding_storage.sql:10-39`). Bucket `observations` privado, 5 MB, leitura por URL assinada 1h (`data/index.ts:513-520`). `deleteObservation` apaga só a linha (`data/index.ts:499-501`; grep `storage.from('observations').remove` = 0) → **fotos de crianças órfãs no bucket**. A mesma foto é gravada uma vez e referenciada por N registros quando se marca várias crianças (`Observations.tsx:66-70`).

### 1.8 Filas, crons, e-mail, logs, testes
- Jobs/crons: **nenhum** (grep `pg_net|pg_cron|crons|resend|nodemailer|sendgrid` = 0). Só webhooks Stripe/Asaas.
- E-mail: só os transacionais do Supabase Auth (reset). ROADMAP E4 (Resend) é DOCUMENTADO MAS NÃO IMPLEMENTADO.
- Telemetria: `ai_usage`; `console.error` em erro 500 (`api/_lib/supabase.ts:105`); nada de analytics, Sentry ou auditoria.
- Testes: só `src/lib/gradeEngine.test.ts` (22 casos). `vitest.config.ts` inclui `api/**/*.test.ts` mas não há nenhum. Zero testes de RLS, API, UI.

---

## 2. IA

### 2.1 Provedor e modelo
`api/_lib/providers.ts:23-31`: `AI_PROVIDER` (`gemini` default | `openai`), `AI_API_KEY`, `AI_MODEL` (default `gemini-2.5-flash` ou `gpt-4o-mini`), `AI_MODEL_<FEATURE>` por funcionalidade. Chamada única sem `temperature`, `max_tokens`, JSON mode, streaming, retry ou timeout (`:33-63`). `PROMPT_VERSION = '2026-09-11'` (`prompts.ts:11`) volta na resposta mas **não é persistido** em `ai_usage` nem em `student_documents`.

### 2.2 Prompts (literais, `api/_lib/prompts.ts`)
- Relatório, system (`:49-53`): *"Você é um assistente especializado em redação pedagógica. Sua tarefa é transformar observações de professores em relatórios descritivos profissionais, acolhedores e focados no desenvolvimento do aluno. […] siga rigorosamente a BNCC. Refira-se à criança apenas pelo primeiro nome informado."* User (`:66-96`): nome, idade, turma, professor(a), disciplina, finalidade, tom; "INFORMAÇÕES ADICIONAIS"; 7 blocos BNCC com itens `[CONSOLIDADO]/[EM DESENVOLVIMENTO]` + "Observações da professora"; potencialidades; pontos de atenção; *"Não use listas. […] Não invente fatos que não estejam nos dados acima."*
- PEI, system (`:118-141`): *"Você é um especialista em educação inclusiva, psicopedagogia e desenvolvimento infantil. […] METAS SMART (OBRIGATÓRIO) […] ESTRUTURA OBRIGATÓRIA: 1. PERFIL DO ESTUDANTE (Resumo técnico baseado no diagnóstico e idade) 2. DIRETRIZES GERAIS 3. ESTRATÉGIAS DE SALA DE AULA 4. QUADRO DE METAS SMART (…TABELA Markdown…) 5. AVALIAÇÃO E MONITORAMENTO 6. ORIENTAÇÕES À FAMÍLIA"*. User (`:149-177`): nome, idade, turma, *"Diagnóstico: …"*, 8 eixos com indicadores marcados + observações.
- Inteligência pedagógica, system (`:192-205`): painel de 9 seções a partir de acertos/erros por aluno; *"sem rótulos negativos"*.
- Copiloto de planejamento, system (`:228-234`); user = **texto livre vindo do cliente** (`buildPlanningPrompt(d) => d.prompt`), montado em `LessonPlanning.tsx:111-116`.

### 2.3 O que entra no contexto
| Feature | Campos enviados | Fonte |
|---|---|---|
| report | primeiro nome (forçado no servidor, `generate.ts:29-31,83`), idade, nome da turma, **nome completo do(a) professor(a)**, disciplina, finalidade, tom, abertura, 7 mapas de checklist BNCC + 7 textos livres, potencialidades, próximos passos | `ReportGenerator.tsx:72-90` |
| pei | primeiro nome, idade, turma, **diagnóstico (texto livre)**, 8 listas de indicadores + 8 textos | `PeiGenerator.tsx:47-60` |
| pedagogical | prova, disciplina, habilidades, uma linha por aluno — o **primeiro nome é aplicado só no cliente** (`PedagogicalIntelligence.tsx:120`) | |
| planning | tema semanal, turma/segmento, metodologia, conteúdo dos dias | `LessonPlanning.tsx:112-116` |

**Não entram**: frequência, notas, relatórios anteriores, fotos, nome da escola. As observações do período (E6) entram no relatório **só se a professora clicar "Usar na ficha"** (`ReportForm.tsx:131-146,281`), que concatena `"DD/MM/AAAA: texto"` nos textos por campo — não há vínculo com `observations.id`. **No PEI as observações não são pré-carregadas** (`PeiForm.tsx` não recebe `observations`), ao contrário do que ROADMAP E6 afirma.

### 2.4 Pseudonimização, limites, uso
Só primeiro nome; nome do professor e da turma saem inteiros. Limite por plano por contagem mensal (mês em horário local do Node em `generate.ts:66` vs `date_trunc('month', now())` UTC na RPC — podem divergir na virada do mês). Sem limite por usuário nem rate limit. `ai_usage` não liga a `student_id`/`document_id` nem guarda custo.

### 2.5 RAG, guardrails, rastreabilidade
- RAG/embeddings: **não existe**.
- Guardrails: só "Não invente fatos" (relatório) e "sem rótulos negativos" (pedagógica). **O prompt de PEI pede explicitamente "Resumo técnico baseado no diagnóstico"** — induz inferência clínica; não há instrução "não diagnostique/não recomende tratamento". Nenhuma validação de saída.
- Rastreabilidade: nenhuma. `student_documents.form_data` guarda as entradas, mas o texto não aponta quais registros sustentam cada trecho. `content` é sobrescrito a cada "Salvar edições" sem versão.
- Revisão humana: `textarea` editável + fluxo draft→submitted→approved.

---

## 3. Mapa de capacidades

| Capability | Persona | Job to be Done | Estado | Qualidade atual (evidência) | Dependências | Risco | Problemas encontrados |
|---|---|---|---|---|---|---|---|
| Provisionar escola | operador da plataforma | criar tenant + 1º admin | EXISTENTE | `PlatformAdmin.tsx:30-45` + `api/platform/schools.ts:71-116` | `platform_admins` via SQL manual | baixo | senha repassada à mão; N+1 no GET |
| Cadastro escola/marca | direção | dados legais, logo, cores | EXISTENTE | `Settings.tsx:159-205`; cores viram CSS vars | bucket `branding` | baixo | marca só pós-login |
| Anos letivos + períodos com datas | direção | definir calendário | EXISTENTE | `YearPeriodsEditor` (`Settings.tsx:337-373`) | — | baixo | `school_years.closed` sem uso |
| Turmas | gestão | criar turmas/regente | EXISTENTE | `ClassManagement.tsx` | professor já criado | baixo | sem loading; ordem turma→usuário→turma |
| Usuários | direção | criar acessos | EXISTENTE | `UserManagement.tsx` | `/api/admin/users` | médio | sem convite; reset pelo admin redireciona errado; excluir professor apaga planos em cascata |
| Alunos (form + xlsx) | gestão | matricular | EXISTENTE | `StudentManagement.tsx`; importação com modelo, prévia e erros | — | baixo | `notes` duplica futuro `student_health`; `max_students` não imposto |
| Frequência | professor | chamada | EXISTENTE | `Attendance.tsx`; modo dia no mobile | — | baixo | deletes sequenciais |
| Conteúdos | professor | diário | EXISTENTE | `Lessons.tsx` | — | baixo | sem edição |
| Notas | professor fund. | lançar por componente | EXISTENTE | `Grades.tsx` + motor testado | `grading_config` | baixo | — |
| Boletim | gestão/família | documento oficial | EXISTENTE | `Bulletin.tsx` | períodos | baixo | `window.print` |
| Histórico escolar | gestão | emitir | PARCIAL | `TranscriptGenerator.tsx` | legal_name/cnpj | baixo | nada persistido |
| Diário impresso | gestão | imprimir | EXISTENTE | `ClassDiary.tsx` | — | baixo | — |
| Relatório descritivo IA | professor infantil | escrever relatório | EXISTENTE | `ReportForm.tsx`+`ReportGenerator.tsx`; rascunho automático; histórico; PDF/Word | `/api/ai/generate` | médio | **não existe "Devolver"**; `review_note` nunca gravado; `reviewed_by` não gravado ao aprovar; "Nome dos Responsáveis" coletado e nunca exibido |
| PEI IA + ciclo de vida | professor/coord. | plano de inclusão | EXISTENTE (ciclo parcial) | `PeiGenerator.tsx:161-166` Enviar/Aprovar; bloqueio sem consentimento | consentimento | alto | sem "Devolver"; sem observações E6; "Turma *" texto livre |
| Planejamento + copiloto | professor/coord. | plano semanal revisado | EXISTENTE | `LessonPlanning.tsx`; único fluxo com devolver + feedback | — | baixo | prompt montado no cliente |
| Inteligência pedagógica | professor fund./coord. | analisar prova | EXISTENTE | análise persistida | — | médio | RLS escola-inteira; não gera ação |
| Observações (E6) | professor | registrar em 20 s | EXISTENTE | `Observations.tsx`; chips por criança, campo BNCC, foto, cobertura por criança; família vê "Momentos" | bucket `observations` | médio | foto órfã ao excluir; sem edição |
| Agenda/comunicados/eventos | equipe/família | comunicar | EXISTENTE | `Agenda.tsx`; "Relatório Diário" (banheiro/alimentação/sono) | — | baixo | sem notificação; emoji como semântica |
| Portal da família | responsável | acompanhar | EXISTENTE | `GuardianHome` | RLS | baixo | sem e-mail/push |
| Financeiro + Asaas (E1) | direção/família | cobrar mensalidade | EXISTENTE (não deployado) | `Finance.tsx` 4 abas; `api/finance/*` | conta Asaas | médio | sem régua de cobrança |
| Saúde/ocorrências/autorizações (E7) | gestão/família | prontuário | **CÓDIGO ÓRFÃO** | componentes importam funções inexistentes; migração não aplicada | — | — | ROADMAP promete "hora e IP"; código grava só `user_agent` |
| Backoffice `/admin` | operador | plano/status/trial | EXISTENTE | `PlatformAdmin.tsx` | — | baixo | sem exportação |
| Billing Stripe | direção | assinar plano | PARCIAL (nunca testado) | código completo | `STRIPE_*` | médio | escola pode se auto-promover |
| Onboarding checklist | direção | primeiros passos | EXISTENTE | `OnboardingChecklist.tsx` | — | baixo | ordem colide com regente |
| Exportações | equipe | PDF/Word/xlsx | EXISTENTE | `html2pdf`, `window.print`, `exportDocx.ts`; xlsx só modelo | — | baixo | não exporta notas/frequência/lista |
| Importações | gestão | xlsx de alunos | EXISTENTE | 4 colunas fixas | — | baixo | única importação |
| Versionamento/auditoria | — | histórico de edições | **NÃO EXISTE** | `content` sobrescrito | — | alto | aprovado editável pelo autor |
| Consentimento LGPD (PEI) | gestão | registrar termo | PARCIAL | checkbox + nome; `pei_consent_at = now()` no clique | termo em `docs/lgpd` | alto | sem upload do termo; revogar não bloqueia leitura |
| Notificações e-mail | — | avisar | DOCUMENTADO MAS NÃO IMPLEMENTADO | ROADMAP E4 | — | — | — |
| Mobile | professor/família | celular | PARCIAL | `md:` em 13/24 páginas | — | médio | sem voz; sem offline |

---

## 4. Core workflows (passos reais)

### 4.1 Escola do zero até o primeiro relatório útil
1. **Plataforma**: inserir `platform_admins` por SQL → `/admin` → "Nova escola" (7 campos) → senha exibida uma vez → repasse manual.
2. **Direção** entra → Home mostra checklist. "Ano letivo" já vem do provisionamento.
3. `/settings?tab=years`: opcionalmente datas dos 4 períodos (8 inputs). Sem isso, aproxima por meses.
4. `/classes` → "Nova turma": segmento, série, letra, **regente** (lista vazia se não há professores), tipo de avaliação.
5. `/users` → "Novo usuário" professor → senha exibida → repasse manual por fora.
6. Voltar em `/classes` → editar turma → vincular regente (passo extra).
7. `/students` → "Novo aluno": nome, nascimento digitado, responsável 1 obrigatório, turma sugerida; ou importar xlsx (modelo → preencher → upload → prévia → confirmar).
8. **Professora** entra → `/reports`: aluno; **idade obrigatória**; faixa BNCC; finalidade; tom; nome do professor; "Nome dos Responsáveis" (inútil); até 50 chips BNCC com 3 estados; 5 textos livres; potencialidades; próximos passos; até 3 fotos → "Gerar" (~10–30 s) → editar → "Enviar para coordenação".
9. **Coordenação**: Home → "Relatórios para revisão" → "Aprovar". Não há devolver nem comentário.
10. **Família**: precisa existir usuário guardian vinculado → Home lista o documento aprovado → Ler/Imprimir.

**Time-to-First-Value estimado** (1 turma, 1 professora, 1 aluno, pessoa que conhece a ordem): ~25–40 min até o primeiro relatório aprovado. Para uma escola típica (5 turmas, 60 alunos, 8 pessoas) sem quem guie: **2–4 h**, dominadas por (a) repasse manual de senhas, (b) cadastro de alunos, (c) idas e voltas turma↔usuário. O valor "IA escreve a partir do bimestre inteiro" só aparece depois de semanas de uso de `/observations`.

**Passos desnecessários / inferíveis / duplicidades**
- Idade obrigatória apesar de `birth_date` existir.
- "Nome dos Responsáveis" coletado e nunca exibido.
- "Turma *" como texto livre no PEI.
- `students.guardian1/2` × `student_guardians` × `student_billing.payer_name` — três representações do responsável.
- `students.notes` ("alergia") × `student_health.allergies` (E7).
- "Relatório Diário" da Agenda × Observações × E7.
- Pesos/componentes de nota **só via JSON**.
- Fotos do relatório ficam só em memória: ao reabrir somem.
- Falta de feedback: ao aprovar, nada avisa professora nem família; "devolvido" inatingível para relatório/PEI.

### 4.2 Outros fluxos
- **Cadastrar aluno**: 4–6 interações. Bom.
- **Registrar observação**: turma e período pré-selecionados → tocar crianças → campo → texto → salvar = 4 toques; foto abre a câmera. É o fluxo mais bem desenhado do produto.
- **Produzir PEI**: consentimento (2 telas) → `/pei` → aluno, idade, turma, diagnóstico, 8 eixos (48 indicadores) → gerar → enviar → aprovar.
- **Revisar/aprovar**: 1 clique; sem diff, sem comentário, sem devolver.
- **Compartilhar com a família**: automático por RLS ao virar `approved`; zero notificação.
- **Gerar cobrança**: ≈10 passos + configuração no site do Asaas.

---

## 5. UX / código

- **Bundle**: um único chunk de **2.684.546 bytes** + CSS 35 KB. Nenhum `lazy(`/`import()`. S6 **não resolvido**.
- **Estilos inline**: 1.302 ocorrências de `style={{`. Hex distintos: 33 (era 79).
- **Design system**: 6 componentes em `src/components/ui`; `PageHeader` em 13/24 páginas; 11 arquivos ainda injetam `<style>` próprio.
- **Loading**: `Skeleton` em 10 páginas; Turmas e Usuários sem estado de carregamento.
- **Mobile**: responsivo em 13 de 24 páginas; `ReportForm` com `grid-cols-2` fixo.
- **Fontes**: Inter via Google Fonts (IP a terceiro).

Dívidas da auditoria de 11/09 resolvidas: S1 (parcial), U1, D2, D1/S2/S4, U2, U10, U12, U14, F3 (parcial), F4, F6, F9, F13. Não resolvidas: U5 (pesos), U6 (Stripe), U9 (parcial), S3 (erros traduzidos), S6 (lazy-load), F8/F12 (e-mail/convite), F10 (grade de planos), S7 (acessibilidade).

---

## 6. Segurança e privacidade (sem declarar conformidade)

### 6.1 RBAC e RLS — gaps concretos
1. **Escalada de privilégio**: `profiles_update` (`saas_multi_tenant.sql:530-533`) deixa qualquer usuário atualizar a própria linha e o `with check` só exige `school_id` → um professor pode `update profiles set role='admin'` via PostgREST com a chave publicável.
2. **Auto-upgrade de plano**: `schools_update` (`:519-522`) sem restrição de colunas → admin da escola altera `plan_id`, `status`, `trial_ends_at`, `feature_overrides`.
3. **Auto-aprovação**: `student_documents_update` (`:610-613`) e `lesson_plans_update` (`:632-635`) permitem ao autor mudar `status` para `approved`.
4. **Resultados de prova escola-inteira**: `assessment_results_select/write` (`:659-664`) → responsável lê/escreve respostas de todas as crianças.
5. **E-mails expostos**: `profiles_select` (`:525-526`) → responsável vê e-mail de toda a equipe e de todos os responsáveis.
6. **Fotos de crianças**: `observations_read` (`observations_periods.sql:71-73`) permite a qualquer autenticado da escola listar/assinar qualquer foto.
7. `agenda_replies_select` e `agenda_events_select` escola-inteira.
8. `incidents_ack_family` (`care.sql:88-91`) deixa a família alterar qualquer coluna da ocorrência.
9. Rotas sem guarda no front para guardian — defesa só por RLS.

### 6.2 Segredos
- Chaves só em env do servidor; `.env` não rastreado.
- `school_secrets.asaas_api_key` em texto claro; token de webhook comparado com `!==`.
- `handler()` devolve `err.message` cru em 500.

### 6.3 Dados enviados ao provedor de IA
Relatório: primeiro nome, idade, turma, nome completo do professor, textos livres da ficha e itens BNCC. PEI: primeiro nome, idade, turma, **diagnóstico em texto livre**, indicadores e textos. Pedagógica: primeiro nome (não forçado no servidor), acertos/erros. Planejamento: texto livre. Nada de CPF/nascimento/responsáveis/fotos — exceto pelo nome do professor e pelo fato de textos livres poderem conter qualquer coisa.

### 6.4 Dados sensíveis — onde ficam, quem vê
- Diagnóstico e indicadores comportamentais: `student_documents.form_data` + `content` (PEI). Sem criptografia de campo.
- `students.notes` (alergias), `students.cpf`, `student_billing.payer_cpf_cnpj/email/phone`.
- Fotos em `observations` (listável pela escola inteira).

### 6.5 Audit trail, retenção, exclusão, portabilidade
- **Audit trail: não existe.** **Versionamento: não existe.**
- **Exclusão**: cascade em `students` apaga documentos, observações e faturas; excluir professor apaga `lesson_plans`.
- **Exportação/portabilidade**: DOCUMENTADO MAS NÃO IMPLEMENTADO.
- **Retenção**: nenhuma rotina.
- **Consentimento**: só timestamp do clique; sem arquivo; revogação não bloqueia leitura.

### 6.6 Sub-processadores reais
Supabase (us-west?), Vercel, Google Gemini ou OpenAI, Stripe, **Asaas**, Google Fonts. `docs/lgpd/DPA.md:56-62` lista só Supabase/Vercel/Google-OpenAI.

### 6.7 Outros
- Sem rate limit em `/api/ai/generate` além da cota mensal; sem tamanho máximo de prompt.
- `finance_webhook_events.id` é PK global: colisão entre escolas descartaria evento.

---

## 7. Git history — linha do tempo

- **04/05/2026**: protótipo single-tenant da Escola Vida de Aprendiz, `mockDb`/`localStorage`, chave de IA no navegador; ≈50 commits no mesmo dia (xlsx, PWA, portal dos pais, relatório com fotos, PEI SMART, copiloto, REP-P criado e revertido, histórico escolar).
- **04/08**: `schema_inicial.sql` (legado).
- **11/09**: virada para SaaS multi-tenant (60591bc, merge 005a10d); auditoria UX + sprint 0.
- **12/09**: E1 financeiro/Asaas + `MERCADO.md` + `ROADMAP.md` (8e7a573); E6 observações, períodos, análise persistida, PEI com ciclo (d295a65); E7 não commitado.

Direção declarada: `MERCADO.md` — "o sistema que a coordenação pedagógica escolhe e o financeiro aprova". Os 4 últimos commits seguem o ROADMAP, mas **nenhum foi enviado ao remoto nem deployado**.

---

## 8. Código morto, features commodity e complexidade prematura

**Código morto / estados inatingíveis**: `document_status='returned'` para `student_documents`; `review_note`; `ReportForm.parentsName`; `AISuggestion.isFavorite`; `agenda_events.notify`; `enrollments.evaluation_type_override/evaluation_note`; `school_years.closed`; `plans.max_students`; `PROMPT_VERSION` descartado; `src/App.css`, `src/assets/hero.png`; `supabase/legacy-single-tenant/*`; `StudentCare.tsx`, `AuthorizationsTab.tsx`, `care.sql` órfãos; `manifest.json` sem SW.

**Commodity**: Agenda com "Relatório Diário" de emojis; ranking "Melhores médias (top 5)" (`Management.tsx:88-103`); donuts de chamada; boletim/histórico/diário por `window.print`; Stripe Checkout antes da primeira escola paga.

**Complexidade prematura**: três camadas de gating de features e quatro planos; dois provedores de IA + modelo por feature sem teste; `teacher_assignments.subject_id` por convenção; `PrintPreview` via `html2canvas`; `framer-motion` para um drawer; 14 páginas chamam `listStudents` inteiro; GET de escolas com 3 queries por escola.

**Bugs objetivos**: (1) `tsc -b` quebrado pelos WIP; (2) reset de senha pela direção não abre `ResetPassword`; (3) fotos nunca removidas do bucket; (4) cota de IA mês local vs UTC; (5) `reviewed_by` não gravado; (6) aprovados editáveis; (7) escalada de `role` e auto-upgrade de plano via RLS.
