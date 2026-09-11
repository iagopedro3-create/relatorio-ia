# Setup: do zero à primeira escola

## 1. Supabase

1. Crie um projeto (ou reative o existente) no Supabase, região `sa-east-1`
   (São Paulo) de preferência — dados de crianças, quanto mais perto, melhor.
2. Aplique as migrações de `supabase/migrations/` na ordem (drop do legado,
   schema multi-tenant, storage, ajuste de RLS do responsável):
   - pelo SQL Editor (colar e executar), ou
   - `npx supabase link --project-ref <ref>` e `npx supabase db push`.
   > **Projeto `axnfmsyfqlnsevucsiaz` ("Althion Education"): já aplicadas em
   > 11/09/2026**, com RLS testada (isolamento entre escolas, professor só
   > na própria turma, responsável só o filho e documentos aprovados) e zero
   > alertas no Security Advisor. Não reaplicar.
3. Em **Authentication → URL Configuration**, defina o Site URL do app e
   adicione `https://<app>/redefinir-senha` nas Redirect URLs.
4. Em **Authentication → Email Templates**, personalize o e-mail de
   redefinição (o front trata o link em `/redefinir-senha`).
5. Anote: URL do projeto, chave publicável (`sb_publishable_...` ou anon) e a
   `service_role`.

## 2. Vercel

1. Importe o repositório. Framework: Vite. `vercel.json` já cuida das
   rewrites do SPA e das funções em `/api`.
2. Variáveis de ambiente (produção e preview), conforme `.env.example`:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_PRODUCT_NAME`
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (**Sensitive**)
   - `AI_PROVIDER`, `AI_API_KEY` (**Sensitive**), `AI_MODEL`
   - `APP_URL`
   - opcionais: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICES`
3. Deploy.

> Provedor de IA: use a API paga (Gemini API com billing ou OpenAI). Chaves
> gratuitas do AI Studio podem usar os dados para melhoria do produto — não
> servem para dados de alunos. Veja `docs/lgpd/README.md`.

## 3. Primeiro admin da plataforma (você)

1. Crie seu usuário em **Authentication → Users → Add user** (e-mail + senha,
   "Auto Confirm").
2. No SQL Editor:
   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'voce@empresa.com';
   ```
3. Entre no app com esse usuário: sem perfil em escola, ele cai direto no
   backoffice (`/admin`).

> Feito em 11/09/2026 para `iago@althionops.com.br` no projeto
> `axnfmsyfqlnsevucsiaz`.

## 3b. Rodar local com as funções `/api`

`npm run dev` já serve `/api/*` (plugin em `scripts/vite-api-plugin.ts`).
Basta ter no `.env` local, além das `VITE_*`: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`,
`APP_URL=http://localhost:5173`. `vercel dev` continua funcionando, mas não é
necessário.

## 4. Provisionar uma escola

No backoffice, **Nova escola**: nome, slug, plano, dias de trial e o primeiro
admin (nome + e-mail). A senha inicial aparece uma vez — repasse à direção.

Alternativa para demonstração local:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo.ts escola-demo
```

Cria escola, ano letivo, turmas, alunos, equipe e um responsável (senha
`Demo@2026`).

## 5. O que a direção faz no primeiro acesso

1. **Configurações → Escola**: razão social, CNPJ, cidade/UF, texto de
   autorização (histórico escolar).
2. **Configurações → Marca**: logo e cores.
3. **Configurações → Anos letivos**: confirmar o ano ativo.
4. **Configurações → Avaliação**: revisar escala, média, frequência mínima,
   séries e disciplinas (o default é 0–100, média 70, 75% de frequência).
5. **Turmas**, **Usuários** (professores, coordenação, responsáveis) e
   **Alunos** (formulário ou planilha).
6. Colher o **termo de consentimento do PEI** dos responsáveis que precisarem
   (`docs/lgpd/TERMO-CONSENTIMENTO-PEI.md`) e marcar no cadastro do aluno.

## 6. Cobrança (opcional)

- Crie os produtos/preços no Stripe e preencha `STRIPE_PRICES`
  (`{"essencial":"price_...","completo":"price_..."}`).
- Webhook: `https://<app>/api/billing/webhook`, eventos
  `checkout.session.completed`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.payment_failed`.
- Sem Stripe, o status/plano é gerido à mão no backoffice.

## 7. Operação

- **Uso de IA** por escola: backoffice → Uso. Limite mensal vem do plano
  (`plans.ai_monthly_credits`); a função `/api/ai/generate` barra quando
  estoura.
- **Trial vencido / inadimplência**: o front mostra aviso e bloqueia as telas
  (7 dias de carência em `past_due`); a IA recusa. A direção ainda entra em
  Configurações para assinar.
- **Planos**: tabela `plans` — edite limites e flags (`features`) direto no
  banco; a UI esconde o que o plano não inclui.
