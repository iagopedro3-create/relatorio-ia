# Althion Education

Plataforma pedagógica **multi-tenant, whitelabel, por assinatura** para escolas
de Educação Infantil e Fundamental I:

- **Relatório descritivo com IA** (BNCC, por campo de experiência), com fluxo
  professor → coordenação → aprovado, impressão e Word.
- **PEI** com metas SMART, bloqueado até o consentimento LGPD do responsável.
- **Copiloto de planejamento** de aulas e **inteligência pedagógica** sobre
  avaliações.
- Frequência, conteúdos, notas (motor de cálculo parametrizado por escola),
  boletim, diário impresso, histórico escolar, agenda digital e portal da
  família.
- Cada escola tem sua marca (logo, cores, razão social), sua política de
  avaliação e seus limites de plano. A chave de IA é da plataforma e o uso é
  medido por escola.

## Stack

React 19 + Vite + TypeScript + Tailwind v4 · Supabase (Postgres, Auth, RLS,
Storage) · Funções serverless em `/api` (Vercel, Node) · Gemini ou OpenAI no
servidor · Stripe (opcional) · Vitest.

## Estrutura

```
api/                 funções serverless (usam service_role; nunca o front)
  _lib/              auth do chamador, provedores de IA, prompts versionados
  ai/generate.ts     toda geração de IA passa aqui (plano, limite, uso, LGPD)
  admin/users.ts     direção cria/desativa usuários da própria escola
  platform/schools.ts backoffice: provisionar escola, plano, trial, status
  billing/           checkout + webhook do Stripe
src/
  contexts/          AuthContext (sessão + perfil) e SchoolContext (escola, plano, marca, config)
  data/index.ts      camada de dados: uma função por operação (supabase-js + RLS)
  lib/               gradeEngine (puro, testado), branding, aiService, supabase, format, markdown
  store/             gradingConfig (default parametrizável), bnccData, agendaMeta
  pages/, components/
supabase/migrations/ schema multi-tenant + RLS + storage (20260911100000)
supabase/legacy-single-tenant/  schema antigo, só referência
scripts/seed-demo.ts escola de demonstração completa
docs/lgpd/           DPA, política de privacidade, termo do PEI, desenho de proteção
docs/SETUP.md        passo a passo de deploy e provisionamento
```

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev            # front em http://localhost:5173
```

O `vite dev` também serve as funções de `/api` no formato da Vercel
(`scripts/vite-api-plugin.ts`), lendo as variáveis de servidor do `.env`
(`SUPABASE_SERVICE_ROLE_KEY`, `AI_API_KEY`...). Sem elas, o front funciona
para tudo que não é IA/usuários/backoffice — e essas rotas respondem com o
erro de configuração em vez de quebrar.

```bash
npm run typecheck   # tsc -b (app + api + scripts)
npm run lint
npm test            # vitest: motor de notas e config de avaliação
npm run build
```

## Deploy e provisionamento

Veja [docs/SETUP.md](docs/SETUP.md): criar o projeto Supabase, aplicar a
migração, configurar a Vercel, nomear o primeiro admin da plataforma e
provisionar a primeira escola.

## Princípios que o código segue

- **Tudo tem `school_id` e RLS.** O front nunca filtra por escola "na mão";
  o banco não devolve o que não é seu.
- **Segredo só no servidor.** `service_role` e chave de IA vivem em `/api`.
- **IA recebe o mínimo.** Primeiro nome, idade, turma e observações — nunca
  sobrenome, nascimento, CPF, responsáveis ou fotos (`api/_lib/prompts.ts`).
- **Política de avaliação é dado.** `schools.grading_config` sobrescreve o
  default de `src/store/gradingConfig.ts`; o motor (`lib/gradeEngine.ts`) não
  muda de escola para escola.
- **Marca é dado.** `schools.branding` vira CSS vars em runtime
  (`lib/branding.ts`); nenhuma cor ou nome de escola no código.
- **Cor é token, não hex.** Telas usam `var(--color-*)` de `src/index.css`:
  marca (`primary/secondary/accent/bg` + derivadas `*-soft/*-border/*-text`
  via `color-mix`) e semânticas (`success/warning/danger`, neutros). Hex só
  em `PrintPreview`/exportação. Componentes base em `src/components/ui`
  (`PageHeader`, `Badge`, `EmptyState`, `Skeleton*`, `ConfirmDialog`,
  `DataTable`) — tela nova começa por eles; `window.confirm` não se usa.
