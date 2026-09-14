# PRODUCT AUDIT — Althion Education

Data: 13–14/09/2026. Evidência primária: leitura completa do repositório (apêndice `research/01-auditoria-codigo.md`, com caminhos e linhas). Este documento é a síntese crítica; o apêndice é a prova.

Legenda de estado: **EXISTENTE** · **PARCIAL** · **DOCUMENTADO MAS NÃO IMPLEMENTADO** · **CÓDIGO MORTO** · **HIPÓTESE** · **RECOMENDAÇÃO**.

---

## 1. O que o produto é hoje (fato)

- SaaS whitelabel multi-tenant para escolas de Educação Infantil e Fundamental I. React + Vite no front, funções serverless em `api/` na Vercel, Supabase (Postgres + Auth + Storage). Produção em althioneduapp.vercel.app.
- **24 páginas**, 8 endpoints, 22+ tabelas com RLS, 4 planos, 4 papéis (admin, coordinator, teacher, guardian).
- **Zero escolas reais.** Uma escola demo seedada. Nenhum usuário externo jamais usou o produto.
- Os quatro últimos commits (auditoria UX, sprint 0, financeiro/Asaas, observações/períodos/PEI com ciclo) **estão só no checkout local**: não foram enviados ao remoto nem deployados. O build em `dist/` é de 11/09 e não contém financeiro nem observações.
- E7 (saúde/ocorrências/autorizações) é migração não aplicada + dois componentes órfãos que **quebram o typecheck local** (40 erros).

## 2. Arquitetura reconstruída (resumo)

| Camada | Estado | Observação crítica |
|---|---|---|
| Multi-tenancy | EXISTENTE | `school_id` denormalizado em tudo; `app.current_school_id()` via `profiles`. Base sólida. |
| RLS | EXISTENTE com furos | 9 gaps concretos (seção 6). Três são graves: um professor pode virar admin; a escola pode se auto-promover de plano; o autor pode auto-aprovar documento. |
| Auth | EXISTENTE | E-mail+senha; **sem convite por e-mail**; senha inicial repassada à mão. Reset disparado pela direção cai na tela errada. |
| IA | EXISTENTE | Chave no servidor; primeiro nome só; 4 prompts; sem RAG, sem streaming, sem retry, sem versionamento persistido, sem guardrail clínico, sem citação de evidência. |
| Observações (E6) | EXISTENTE (local) | Melhor fluxo do produto: 4 toques, câmera, campo BNCC, cobertura por criança. Entram no relatório **só por copy-paste** ("Usar na ficha"); **não entram no PEI**. |
| PEI | EXISTENTE (raso) | O documento inteiro é um markdown. **Não existe objeto "meta"**: não há como ligar evidência, medir progresso ou revisar meta a meta. Ciclo enviar→aprovar sem "devolver". |
| Relatório descritivo | EXISTENTE | Ficha de 50 chips BNCC + 7 textos → IA → textarea → enviar → aprovar (sem devolver, sem comentário, sem versão). |
| Financeiro (E1) | EXISTENTE (não deployado) | Asaas da própria escola; PIX/boleto; webhook idempotente. Bem construído; **fora do wedge** (seção 8). |
| Portal da família | EXISTENTE | Documentos aprovados, momentos, frequência, agenda. Sem notificação alguma. |
| Notificações | DOCUMENTADO MAS NÃO IMPLEMENTADO | Nada de e-mail/push além do reset de senha. |
| Versionamento / audit trail | NÃO EXISTE | `content` sobrescrito; aprovado continua editável. |
| Exportação/portabilidade LGPD | DOCUMENTADO MAS NÃO IMPLEMENTADO | O README LGPD promete; não há código. |
| Testes | PARCIAL | 22 testes do motor de notas. Zero de RLS, API, UI. |
| Jobs/crons/filas | NÃO EXISTE | — |

## 3. Mapa de capacidades (visão de produto)

A tabela completa com evidência está no apêndice (seção 3). Aqui, a leitura de valor:

| Capability | Persona | JTBD | Estado | Freq. uso | Valor usuário | Valor comprador | Qualidade | Risco | Diferenciação atual | Problema central |
|---|---|---|---|---|---|---|---|---|---|---|
| Observações por criança (foto, BNCC) | professora | "registrar em 20 s o que vi hoje" | EXISTENTE | diária | alto | médio | boa | médio (fotos órfãs, storage listável) | média (Memoz, Diário Escola, Kinderpedia fazem) | isolada do PEI; entra no relatório só por cola |
| Relatório descritivo com IA | professora EI | "escrever 25 relatórios no fim do bimestre" | EXISTENTE | 2–4×/ano | alto | alto | média | médio | **baixa** (ChatGPT + Docs faz 80%) | não cita evidência; sem devolver; sem versão |
| PEI com IA | coord./AEE | "cumprir o PEI obrigatório e orientar a professora" | EXISTENTE (raso) | 1–2×/ano + revisões | alto | **muito alto** (obrigação legal desde 12/2025) | baixa | **alto** (diagnóstico em texto livre para a IA; sem trilha) | baixa (Vínculo, Somos, AEE Pro fazem) | PEI é um texto, não um plano vivo |
| Ciclo enviar→aprovar | coord. | "revisar antes de ir para a família" | PARCIAL | por documento | médio | alto | fraca | baixo | média | sem devolver, comentário, diff, notificação |
| Portal da família | responsável | "saber como meu filho está" | EXISTENTE | semanal | médio | alto (argumento de matrícula) | boa | baixo | baixa (Arco, Bemobi, Layers) | ninguém é avisado de nada |
| Frequência / notas / boletim | professor Fund. | rotina | EXISTENTE | diária/bimestral | médio | médio | boa (motor testado) | baixo | nenhuma | commodity; ERP já faz |
| Financeiro + Asaas | direção/família | "cobrar mensalidade" | EXISTENTE (local) | mensal | alto | alto | boa | médio | baixa (todo ERP + Arco/Agenda Edu) | **tira foco**; concorre com Sponte |
| Copiloto de planejamento | professor | "ideias de aula" | EXISTENTE | semanal | baixo | baixo | média | baixo | **nula** (ChatGPT, Teachy grátis) | prompt livre do cliente |
| Inteligência pedagógica (prova) | prof. Fund. | "analisar resultado" | EXISTENTE | por prova | médio | baixo | média | médio (RLS escola-inteira) | baixa | não gera ação |
| Agenda/comunicados | todos | comunicar | EXISTENTE | diária | médio | médio | média | baixo | nula | "Relatório diário" de emojis vira texto morto |
| Marca da escola | direção | "o app da minha escola" | EXISTENTE | setup | médio | alto | boa | baixo | média (ERPs colocam a marca deles) | só pós-login |
| Histórico escolar, diário impresso | secretaria | emitir | PARCIAL | anual | baixo | baixo | fraca | baixo | nula | nada persiste |
| Backoffice `/admin`, Stripe | operador | provisionar/cobrar | EXISTENTE/PARCIAL | raro | — | — | ok | médio | — | Stripe nunca testado; escola pode se auto-promover |
| Cuidado (E7) | gestão/família | prontuário | CÓDIGO ÓRFÃO | — | — | — | — | — | — | quebra o build |

## 4. Core workflows encontrados no código

1. Provisionar escola (operador) → checklist → ano letivo → turmas → usuários (senha à mão) → alunos (form/xlsx).
2. Registrar observação (professora, mobile).
3. Produzir relatório: ficha → IA → editar → enviar → aprovar → família vê.
4. Produzir PEI: consentimento no cadastro → ficha 8 eixos + diagnóstico → IA → editar → enviar → aprovar.
5. Plano de aula: escrever → copiloto → enviar → aprovar/devolver com feedback (único fluxo completo).
6. Chamada / conteúdos / notas / boletim.
7. Avaliação → resultados → análise IA persistida.
8. Agenda: comunicado/evento/relatório diário → réplicas → leitura.
9. Cobrança: conectar Asaas → plano → pagador → gerar mês → emitir → família paga.
10. Marca, períodos, pesos (JSON), usuários, planos (backoffice).

**Não existem** (apesar de o ROADMAP/MERCADO sugerirem): acompanhar objetivo, atualizar plano, revisar PEI ao longo do ano, relatório de progresso de meta, devolver documento, notificar, exportar, importar documentos antigos.

## 5. UX e Time-to-First-Value

- **TTFV medido no código**: 25–40 min para quem conhece a ordem; **2–4 h para uma escola típica sem guia** (senhas à mão, cadastro de alunos, ida e volta turma↔usuário). Detalhe no apêndice 4.1.
- O valor prometido ("a IA escreve a partir do bimestre inteiro") só aparece **semanas depois**, quando existirem observações. Ou seja: o produto pede semanas de disciplina antes de mostrar o diferencial. Isso é o oposto de um bom time-to-value.
- Passos desnecessários: idade obrigatória (há `birth_date`), "Nome dos Responsáveis" coletado e nunca usado, turma como texto livre no PEI, pesos por JSON, três representações do responsável, fotos do relatório perdidas ao reabrir.
- Falta de feedback: aprovar não avisa ninguém; "devolvido" é um estado inatingível para relatório e PEI.
- Mobile: 13 de 24 páginas responsivas; ficha do relatório com 50 chips em duas colunas no celular.
- Bundle único de 2,7 MB; sem lazy-load.

**RECOMENDAÇÃO (detalhada em PRODUCT_OPPORTUNITIES §3)**: redefinir o primeiro valor como *"em 15 minutos, o PEI que a escola já tem no Word vira um plano estruturado com metas, e a professora recebe no celular o que observar esta semana"*. Isso muda a ordem do onboarding: importar alunos → marcar as crianças acompanhadas → importar/gerar PEI → convidar professora. Tudo o resto (turmas completas, notas, agenda) vem depois.

## 6. Segurança e privacidade — gaps (sem declarar conformidade)

Antes de qualquer escola real:

1. **Escalada de privilégio**: `profiles_update` permite ao próprio usuário mudar `role` (professor → admin) pela API pública.
2. **Auto-upgrade**: `schools_update` permite ao admin da escola mudar `plan_id`, `status`, `trial_ends_at`, `feature_overrides`.
3. **Auto-aprovação**: autor pode setar `status='approved'` em documentos e planos.
4. Resultados de prova, réplicas e eventos legíveis pela escola inteira, inclusive responsáveis.
5. E-mails de toda a equipe e de todos os responsáveis visíveis a qualquer usuário da escola.
6. Fotos de crianças listáveis por qualquer autenticado da escola (policy de storage).
7. Sem audit trail, sem versionamento, sem exportação, sem retenção, sem exclusão seletiva (cascade apaga faturas e documentos).
8. Diagnóstico da criança vai em texto livre para OpenAI/Gemini; prompt do PEI pede "perfil técnico baseado no diagnóstico" — induz inferência clínica.
9. Banco aparentemente em us-west (transferência internacional de dados de crianças não documentada); DPA não lista Asaas, Stripe, Google Fonts.
10. Consentimento do PEI = timestamp de um checkbox; revogar não bloqueia leitura dos PEIs existentes.
11. Chave do Asaas em texto claro; token de webhook comparado sem tempo constante; erros 500 vazam mensagem do banco.

Contexto regulatório que torna isso urgente: CNE aprovou em 01/09/2026 diretrizes de IA por risco; **"perfilamento acadêmico individualizado" é risco alto** e exige avaliação de impacto, supervisão humana contínua e registro. ANPD elegeu crianças + IA como eixos de fiscalização 2026–27. (Apêndice 03 §7.)

## 7. O que a história do git diz sobre a estratégia

- 04/05/2026: protótipo para uma escola (VdA) construído em um dia — relatório, PEI, agenda, portal, histórico, tudo.
- 11/09/2026: virada para SaaS multi-tenant, sem cliente.
- 12/09/2026: `MERCADO.md` define a tese "o sistema que a coordenação escolhe e o financeiro aprova" e o ROADMAP encadeia **financeiro → observações → cuidado → coerência → mapa BNCC → histórico → notificações → operação**.
- O padrão é claro: **amplitude antes de profundidade, paridade antes de diferencial**. Em 48 horas o produto ganhou financeiro, observações, períodos, PEI com ciclo e um módulo de cuidado — e continua sem uma escola, sem convite por e-mail, sem devolver documento e sem meta de PEI.

## 8. Diagnóstico

**O produto é um ERP-lite com IA acoplada, construído para uma escola que não existe mais como cliente.** A tese de MERCADO está certa sobre *onde ninguém está* (o trabalho da professora, a documentação contínua, o PEI) e errada sobre *como entrar*: exigir paridade com Sponte/Arco (financeiro, autorizações, saúde, chamada) antes de ter o diferencial pronto e provado.

O diferencial que o próprio MERCADO descreve — "IA escreve a partir do que você observou o bimestre inteiro" — hoje é um botão de copiar texto. E o PEI, que virou obrigação legal em dezembro de 2025 com "atualização contínua" exigida por decreto, é um markdown sem metas rastreáveis.

O que está bom e deve ser preservado: base multi-tenant + RLS (corrigidos os furos), IA no servidor com pseudonimização, o fluxo de observações, o gate de consentimento, marca por escola, importação de alunos, motor de notas testado, velocidade de construção.

Os documentos seguintes (COMPETITIVE_LANDSCAPE, PRODUCT_OPPORTUNITIES, SWITCHING_STRATEGY, GTM_STRATEGY, PRODUCT_ROADMAP) constroem, a partir daqui, o produto que uma escola teria motivo econômico, operacional e pedagógico para adotar.
