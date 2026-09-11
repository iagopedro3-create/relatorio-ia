# Auditoria de produto, UX/UI e coerência de recursos — 11/09/2026

**Escopo:** app em `localhost:5173` (mesmo build de `althioneduapp.vercel.app`), escola demo, perfis diretora / coordenação / professor / responsável / backoffice. Método: navegação por todas as 17 rotas em cada perfil, leitura do código de `src/pages` e `src/components`, métricas por grep, testes de fluxo ponta a ponta feitos nas sessões anteriores.

**Veredito curto:** a base está sólida (multi-tenant, RLS, IA no servidor, fluxos principais funcionam de ponta a ponta). O que impede vender hoje não é bug, é **acabamento**: o produto parece cinco telas de autores diferentes, dá pouco feedback enquanto carrega, e alguns recursos existem sem ligar-se ao resto (PEI, Inteligência Pedagógica, Histórico). Nada aqui exige refazer arquitetura.

Prioridades: **P0** bloqueia demo/venda · **P1** primeira escola sente na primeira semana · **P2** melhoria.

---

## 1. Design e consistência visual

| # | Achado | Evidência | Prior. |
|---|--------|-----------|--------|
| D1 | **Não existe design system.** 1 213 `style={{…}}` inline em páginas/componentes e 79 cores hex distintas; só 4 componentes reutilizáveis (Layout, PeiForm, PrintPreview, ReportForm). Cada tela redefine card, badge, tabela, estado vazio. | `grep -c "style={{" src/pages/*.tsx` | P0 |
| D2 | **Branding por escola só pega parcialmente.** Os tokens `--color-primary/secondary` existem, mas dezenas de telas usam hex fixo (`#0f172a`, `#10b981`, `#d97706`, `#b45309`…). Uma escola com marca vermelha vai ver botões verdes/azuis "de fábrica" em Planejamento, Painel, Boletim. | `Management.tsx:126,216`, `LessonPlanning.tsx:286` | P0 |
| D3 | Dois padrões de página convivem: telas antigas (`h2` 2rem 800, cards com borda superior colorida gradiente) e telas novas (Tailwind, `rounded-xl border-2`). Home do responsável e Agenda são de um estilo; Inteligência Pedagógica e Planejamento são de outro. | Home vs Intelligence | P1 |
| D4 | Hierarquia tipográfica inconsistente: títulos de página variam entre 1.3, 1.5, 1.75 e 2rem; pesos 700/800/900 misturados na mesma tela. | `Home.tsx:89,98,271`; `Management.tsx:126,147` | P1 |
| D5 | Ícones e emoji misturados como semântica ("🏫 Toda a escola" na Agenda vs. ícones Lucide no resto). | `Agenda.tsx` | P2 |
| D6 | Logo do produto no topo da sidebar usa "EDUCATION" em tracking largo que quebra em "EDUCATIO N" no `logo.svg` em 130px. | screenshot sidebar | P2 |
| D7 | Cards de KPI com borda superior em gradiente de cor **arbitrária** (verde, azul, laranja) sem significado — verde não quer dizer "bom". Com marca da escola aplicada, três cores de acento viram ruído. | Home responsável | P2 |

## 2. UX por perfil

### Diretora / coordenação
| # | Achado | Prior. |
|---|--------|--------|
| U1 | **Não há onboarding.** Escola nova cai numa Home vazia sem dizer "1) crie o ano letivo, 2) turmas, 3) alunos, 4) usuários". A ordem certa está só em `docs/SETUP.md`. Sem isso a demo comercial depende de você guiar na mão. | P0 |
| U2 | **Planos de aula enviados não aparecem na Home.** A Home da coordenação mostra "Relatórios para Revisão" mas ignora planos com `status='submitted'`; o coordenador só descobre entrando em Planejamento. | P1 |
| U3 | "Painel Administrativo" (`/`) e "Escola e Marca" (`/settings`) têm papéis pouco claros. O painel mistura KPIs pedagógicos (top 5 médias, chamada de hoje) com contadores administrativos; não há ação a tomar em nenhum card — é só leitura. | P1 |
| U4 | Selector de ano letivo fica no rodapé da sidebar; trocar de ano recarrega tudo sem indicar que o contexto mudou. | P2 |
| U5 | Configuração de avaliação: modo visual só edita disciplinas e séries; **pesos, componentes e recuperação exigem editar JSON** (`Settings.tsx:268-271`). Nenhuma diretora vai fazer isso. | P1 |
| U6 | Stripe: botão "Assinar" chama `/api/billing/checkout`, mas nunca foi testado com chaves reais; sem `STRIPE_*` o botão dá erro genérico em vez de "fale com a plataforma". | P1 |
| U7 | Backoffice `/admin` cria escola mas **não cria o primeiro admin da escola** — depende de `scripts/seed-demo.ts` ou de inserir à mão. Provisionar uma escola nova hoje é operação técnica. | P0 |

### Professor
| # | Achado | Prior. |
|---|--------|--------|
| U8 | Ordem do menu não segue a rotina: Frequência → Conteúdos → Notas → Boletim → Diário → Inteligência → (Relatórios) Relatório IA → PEI. Professor de infantil vê "Inteligência Pedagógica" antes de "Relatório IA", que é o seu produto principal. | P1 |
| U9 | Frequência: tabela de 30 colunas com scroll horizontal; não há modo "hoje" (marcar a chamada do dia em uma lista vertical). Em celular é inutilizável. | P1 |
| U10 | Relatório IA: fluxo bom (gera → rascunho salvo → enviar). Mas depois de "Enviar para coordenação" o professor não recebe nada quando o doc volta como "devolvido" — precisa abrir o aluno para ver o status. Não há comentário da coordenação no relatório (só no plano de aula). | P1 |
| U11 | Lançar Notas: colunas vêm do motor (bom), mas não há indicação de qual coluna é calculada vs. editável além do fundo cinza; sem legenda. | P2 |
| U12 | "Sua Meta: 1º Bimestre" na Home usa o primeiro período do ano fixo — no meio do ano continua apontando para o 1º bimestre. Deveria ser o período corrente. | P1 |

### Responsável
| # | Achado | Prior. |
|---|--------|--------|
| U13 | Experiência é a mais coerente (Home + Agenda + documentos aprovados). Mas "Frequência —" com "Sem registros ainda" e "Próximo evento: -" na demo passam sensação de sistema vazio; falta *empty state* que explique ("a escola ainda não lançou"). | P2 |
| U14 | Responsável com mais de um filho: a Home mostra só o primeiro (`Acompanhando … de Lucas Silva`). Não há seletor de filho. | P1 |
| U15 | Documentos aprovados só aparecem se `status='approved'` — e o **PEI nunca chega a `approved`** (ver F3). Pais nunca verão um PEI. | P1 |

## 3. Usabilidade transversal

| # | Achado | Evidência | Prior. |
|---|--------|-----------|--------|
| S1 | **Feedback de carregamento quase inexistente.** Só 6 ocorrências de "Carregando" em 24 telas. Home, Painel, Relatório IA, PEI, Histórico, Diário e Configurações usam `useAsync` sem mostrar estado — com o banco em us-west (~2-3 s), a tela fica em branco/zerada e depois "pula". Isso será lido como bug. | `grep -l Carregando src/pages` | P0 |
| S2 | 8 confirmações destrutivas usam `window.confirm` nativo (Turmas, Alunos, Usuários, Agenda, Conteúdos, Planejamento, Inteligência). Texto avisa "frequência, notas e relatórios serão apagados" mas em diálogo de sistema, sem desfazer. | `StudentManagement.tsx:176`, `ClassManagement.tsx:107` | P1 |
| S3 | Toasts existem (`react-hot-toast`) mas erros de rede/RLS chegam como mensagem crua do Supabase (ex.: `new row violates row-level security policy`). Falta tradução das mensagens comuns. | `src/data/index.ts` | P1 |
| S4 | 23 textos diferentes de estado vazio, cada um com tom e formato próprio; nenhum oferece a ação de saída ("Nenhum aluno" → botão "Cadastrar aluno"). | grep "Nenhum" | P2 |
| S5 | Mobile: sidebar vira drawer (ok), mas Frequência, Notas, Boletim e Painel dependem de tabelas largas; Agenda e Home do responsável são as únicas telas realmente confortáveis no celular — justamente as que os pais usam, então o risco é menor do que parece. | `Layout.tsx:194-215` | P1 |
| S6 | Bundle de 2,6 MB (xlsx, docx, html2pdf carregados no primeiro acesso). Em 4G o primeiro login demora. Lazy-load por rota resolve. | `vite build` | P1 |
| S7 | Acessibilidade: cards clicáveis são `div onClick` sem `role/button`, contraste de textos `text-muted` em cards coloridos abaixo de AA, sem foco visível nos itens do menu. | `PedagogicalIntelligence.tsx:174` | P2 |
| S8 | Sem busca global nem atalho para "abrir aluno"; para chegar em um aluno o caminho é Alunos → lista → perfil. | | P2 |

## 4. Recursos: estão conectados e fazem sentido?

| # | Recurso | Estado | Achado | Prior. |
|---|---------|--------|--------|--------|
| F1 | Relatório IA | ✅ ligado | Gera, salva rascunho, envia, coordenação aprova, pai lê/imprime. É o fluxo mais completo e o argumento de venda. | — |
| F2 | Planejamento de aula | ✅ ligado | Rascunho → enviado → aprovado/devolvido com feedback. Falta só aparecer na Home do coordenador (U2). | P1 |
| F3 | **PEI** | ⚠️ meio ligado | Gera e salva, mas **não tem "Enviar para coordenação" nem "Aprovar"** (`PeiGenerator.tsx` só tem "Salvar edições"). Fica em `draft` para sempre → não aparece para o pai, não conta no painel. O consentimento LGPD está certo; o ciclo de vida não. | P1 |
| F4 | **Inteligência Pedagógica** | ⚠️ meio ligado | Avaliações e respostas persistem; **a análise da IA não é salva** (`setResult` em memória, `PedagogicalIntelligence.tsx:127`). Gasta crédito de IA e some ao trocar de tela. Também não gera nenhuma ação (não vira plano, não marca aluno). | P1 |
| F5 | Histórico Escolar | ✅ parcial | Lê notas e frequência do motor para os anos em que o aluno esteve matriculado no sistema (`TranscriptGenerator.tsx:74-76`); anos anteriores à adoção são digitados à mão, o que é esperado. Falta só deixar claro na tela qual linha veio do sistema e qual foi digitada. | P2 |
| F6 | Boletim | ⚠️ aproximação | Frequência por bimestre usa meses fixos (`PERIOD_MONTHS = [[1,2,3],[4,5,6],[7,8],[9,10,11]]`, `Bulletin.tsx:14`) em vez das datas dos períodos do ano letivo. Escola com calendário diferente terá número errado no documento oficial. | P1 |
| F7 | Diário de classe | ✅ | Imprime frequência + conteúdos. Coerente. | — |
| F8 | Agenda Digital | ✅ | Mensagens, eventos, feriados alimentam Frequência (feriado bloqueia dia). Bom exemplo de integração. Falta notificação (e-mail/push): hoje o pai só sabe se abrir o app. | P1 |
| F9 | Painel administrativo | ⚠️ | Só leitura; "Relatórios aprovados 3/12" não linka para os pendentes. KPIs sem ação. | P2 |
| F10 | Planos e features | ✅ | Menu esconde o que o plano não tem. Mas o plano *Essencial* tira Notas/Boletim — escola de fundamental não consegue usar o plano de entrada. Revisar a grade (talvez separar por segmento em vez de por recurso). | P1 |
| F11 | Créditos de IA | ⚠️ | Contador "IA este mês" na sidebar está espremido e não explica o que consome crédito. Sem aviso ao chegar em 80 %. | P2 |
| F12 | Usuários | ✅ | Criar/resetar/desativar funcionam pelo servidor. Falta convite por e-mail — hoje o admin precisa passar a senha por fora. | P1 |
| F13 | Importação de alunos (xlsx) | ✅ | Funciona; sem modelo de planilha para baixar e sem prévia antes de gravar. | P2 |
| F14 | Backoffice | ⚠️ | Lista/cria/edita escolas e mostra uso; não cria o admin inicial (U7), não muda plano com data de vencimento visível, não tem log de IA por escola. | P0 (admin inicial) |

## 5. O que fazer, em ordem

### Sprint 0 — antes de mostrar a qualquer escola (P0)
1. **Estados de carregamento** em todas as telas com `useAsync`: skeleton padrão (um componente) + desabilitar ações até carregar. (S1)
2. **Provisionamento completo no backoffice**: criar escola + admin inicial + e-mail de acesso num só formulário. (U7/F14)
3. **Onboarding guiado** na Home do admin enquanto faltar ano/turma/aluno/usuário: checklist de 4 passos com links. (U1)
4. **Tokens de cor de verdade**: trocar os hex fixos por `var(--color-*)`/classes Tailwind com tema; garantir que a marca da escola cobre 100 % das telas. (D2)
5. Extrair 6 componentes base (`PageHeader`, `Card`, `Badge`, `EmptyState`, `ConfirmDialog`, `DataTable`) e migrar as telas que o vendedor mostra primeiro: Home, Relatório IA, Agenda, Alunos. (D1, S2, S4)

### Sprint 1 — primeira escola piloto (P1)
6. Ciclo de vida do PEI igual ao do relatório (enviar/aprovar/devolver) → pai passa a ver. (F3)
7. Persistir análise da Inteligência Pedagógica em `assessments` e mostrar histórico. (F4)
8. Home da coordenação: planos de aula pendentes + relatórios devolvidos ao professor. (U2, U10)
9. Boletim: frequência por período usando `academic_years.periods` (datas), não meses fixos. (F6)
10. Editor visual de pesos/componentes na aba Avaliação (formulário simples, JSON só como "avançado"). (U5)
11. Mensagens de erro traduzidas + diálogo de confirmação próprio. (S2, S3)
12. Lazy-load das rotas pesadas (xlsx/docx/html2pdf). (S6)
13. Modo "chamada de hoje" na Frequência (lista vertical, funciona no celular). (U9)
14. Seletor de filho para responsável com mais de um aluno. (U14)
15. Convite de usuário por e-mail (Supabase `inviteUserByEmail`) e notificação por e-mail em comunicado/documento aprovado. (F12, F8)
16. Revisar a grade de planos (Essencial sem Notas/Boletim não serve para fundamental). (F10)

### Sprint 2 — polimento (P2)
17. Histórico marcando linhas vindas do sistema vs. digitadas; KPIs do painel com link para a ação; modelo de planilha de importação com prévia; legenda em Notas; busca global; acessibilidade (foco, roles, contraste); estados vazios com ação; período corrente automático na Home; logo sem quebra.

---

## Anexo — métricas coletadas

- Rotas: 17 (`/ /admin /agenda /attendance /bulletin /classes /diary /grades /intelligence /lessons /pei /planning /reports /settings /students /transcript /users`).
- Linhas em `src/pages` + `src/components`: 6 940; maior tela `Agenda.tsx` (508) e `StudentManagement.tsx` (553).
- `style={{` inline: 1 213 · cores hex distintas: 79 · componentes reutilizáveis: 4 · telas com classes responsivas Tailwind: 9 de 24.
- Estados de carregamento visíveis: 6 · `window.confirm`: 8 · textos de estado vazio distintos: 23.
- Bundle de produção: ~2,6 MB (xlsx + docx + html2pdf no chunk inicial).
- Testes automatizados: 22 (motor de notas). Zero testes de UI ou de API.
