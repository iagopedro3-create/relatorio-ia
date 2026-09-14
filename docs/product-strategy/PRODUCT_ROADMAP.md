# PRODUCT ROADMAP — Althion Education

Data: 14/09/2026. Cobre Fase 20 (remover / redesenhar / manter / construir), Fase 22 (NOW / NEXT / LATER / NÃO CONSTRUIR) e Fase 23 (experimentos). Depende das decisões em `EXECUTIVE_RECOMMENDATION.md`.

Premissa: um fundador construindo com IA, sem equipe, sem escola real, com outros projetos em paralelo. O roadmap é deliberadamente estreito.

---

# WHAT I WOULD REMOVE

| Item | Por quê | Ação |
|---|---|---|
| Ranking "Melhores médias (top 5)" no painel da direção | ranquear crianças de Fund I é pedagogicamente questionável e não tem finalidade declarada | remover |
| "Relatório Diário" da Agenda (banheiro/alimentação/sono com emojis em texto) | vira texto morto; concorre com Diário Escola/Beibee, que fazem melhor; duplica observações | remover ou mover para um registro estruturado só se uma escola pedir |
| Copiloto de planejamento com prompt livre do cliente | commodity (Teachy, Gemini grátis); prompt montado no cliente | remover da navegação ou deixar como "beta" sem investimento |
| Stripe Checkout + webhook | nunca testado; escola pode se auto-promover; ninguém vai pagar por cartão self-serve nas primeiras 20 | desligar; cobrar por PIX/boleto manual |
| 4 planos × `features` × `feature_overrides` × "sem plano libera tudo" | complexidade prematura para zero clientes | 1 plano "piloto" + 1 flag `inclusion_only` |
| Dois provedores de IA + modelo por feature via env | sem testes comparativos | fixar um provedor; versionar prompt no banco |
| PDF via `html2pdf`/`html2canvas` (raster) | 500 KB de lib para um JPEG; `window.print` já existe | usar print CSS |
| `framer-motion` para um drawer | 100 KB por uma animação | CSS |
| Campos: idade obrigatória (há `birth_date`), "Nome dos Responsáveis", turma como texto livre no PEI | atrito e minimização ao contrário | inferir/remover |
| Estados mortos: `returned` inatingível, `review_note`, `isFavorite`, `agenda_events.notify`, `enrollments.evaluation_type_override`, `school_years.closed`, `PROMPT_VERSION` descartado | código morto | limpar ou implementar (o `returned` vira feature) |
| E7 (saúde/ocorrências/autorizações) | órfão, quebra o build, fora do wedge | remover do checkout (guardar em branch) |
| E1 financeiro/Asaas em produção | bem construído, mas coloca o produto contra Sponte/isaac e não ajuda a fechar escola pelo pedagógico | **não deployar**; manter em branch; flag desligada |
| Histórico escolar, diário impresso | commodity, nada persiste | congelar |
| Inteligência pedagógica (prova) | commodity; RLS escola-inteira | congelar; corrigir RLS |

# WHAT I WOULD REDESIGN

1. **PEI: de markdown para objeto.** `pei` (estudo de caso, perfil funcional, estratégias, status, versão) + `pei_goals` (meta, critério mensurável, contexto, linha de base, prazo, status, marcado por, data) + `goal_evidence` (meta ↔ observação). A IA rascunha *dentro* da estrutura; a saída em texto é uma *view* (PDF/Word).
2. **Relatório: de ficha para evidência-primeiro.** A tela começa pelas observações do período (já carregadas, por campo BNCC, com lacunas marcadas); a ficha de chips vira complemento. O prompt recebe registros com IDs; a saída vem em blocos com `evidence_ids`; a UI mostra a origem; parágrafo sem evidência é marcado.
3. **Ciclo de revisão completo**: enviar → devolver com comentário → reenviar → aprovar (imutável) → nova versão se editar → família notificada. Igual para relatório, PEI e relatório de progresso.
4. **Onboarding invertido**: conta self-serve com Google → alunos (planilha) → crianças acompanhadas → importar PEI (Word/PDF) → convidar professora. Turmas, períodos, marca, pesos: depois, sob demanda.
5. **Prompts com guardrails**: retirar diagnóstico do prompt (só indicadores funcionais); instruções explícitas de não diagnosticar/inferir/fabricar; saída estruturada (JSON) com evidência; versão do prompt persistida por documento.
6. **RLS**: `role` e `plan_id/status` só por service role; `status='approved'` só por gestão; resultados/eventos/réplicas por turma; storage de fotos por criança; e-mails ocultos para responsáveis.
7. **Perfil da criança = linha do tempo**: observações, documentos, metas, versões, consentimentos, numa só visão (StudentProfile já é o lugar).

# WHAT I WOULD KEEP

- Base multi-tenant + padrão RLS (corrigido) + `school_id` denormalizado.
- IA no servidor, chave da plataforma, primeiro nome só, cota por plano, `ai_usage`.
- Fluxo de observações (4 toques, câmera, campo BNCC, cobertura por criança, "Momentos" para a família).
- Gate de consentimento do PEI (a ser aprofundado).
- Importação de alunos por planilha com prévia.
- Marca por escola (CSS vars), portal da família, frequência mobile, motor de notas testado.
- Design system mínimo (`ui/`), skeletons, checklist de onboarding (reordenado).
- Docs LGPD (a atualizar), CI, `docs/SETUP.md`.
- Código de E1 e E7 em branch, para o dia em que uma escola pedir.

# WHAT I WOULD BUILD NEXT

Ver NOW abaixo. Em uma frase: **o PEI vivo com evidência da sala comum, com importação do que a escola já tem, num ciclo completo e auditável — e nada mais até 5 escolas usarem por dois bimestres.**

---

## NOW — 0–3 meses (provar o wedge)

Ordem importa. Nada de novo entra antes do item 0.

0. **Segurança e higiene (semana 1)**: corrigir os 3 furos graves de RLS + fotos + e-mails; `audit_log` mínimo; remover E7 do checkout (build verde); commitar/push/deploy do que está local **sem** ativar financeiro (flag).
1. **Metas do PEI como objeto** (`pei`, `pei_goals`, `goal_evidence`, `document_versions`), migração dos PEIs em markdown existentes (só demo), UI de metas (criar/editar/marcar progresso com data e autor).
2. **Importar PEI antigo** (Word/PDF → estudo de caso + metas + estratégias, com revisão em tela). Começa por PEI; relatórios no NEXT.
3. **Observação ↔ meta**: ao registrar, sugerir meta (regra simples por criança acompanhada); na Home da professora, "o que observar esta semana" por criança/meta.
4. **Relatório/PEI com citação de evidência**: prompt com IDs, saída estruturada, UI de origem, lacunas por campo.
5. **Ciclo completo**: devolver com comentário; aprovado imutável; versões; notificação por e-mail (Resend) para professora (devolvido/aprovado) e família (aprovado).
6. **Convite por e-mail + login Google + criação de conta self-serve** (sem operador).
7. **Guardrails de prompt** + diagnóstico fora do prompt + aviso de PII + versão de prompt persistida.
8. **Relatório de progresso de meta para a família** (por bimestre, a partir das evidências, revisado).
9. **Piloto**: 3–5 escolas do ICP, gratuitas por dois bimestres, concierge, com métricas do GTM §7.
10. Manter: fluxo de observações, frequência, portal, marca. Congelar todo o resto.

Critério de saída do NOW: 3 escolas com PEI estruturado, ≥ 20 observações ligadas a metas e 1 relatório de progresso aprovado cada.

## NEXT — 3–6 meses (retenção, diferenciação, expansão)

- Relatório descritivo de **todas as crianças** a partir da evidência + **mapa BNCC do bimestre** (E8: crianças/campos sem registro, alerta para coordenação).
- Importar relatórios antigos (Word/PDF).
- Quality guardrails determinísticos (meta sem critério, PEI sem revisão há 90 dias, período sem registro, termos rotuladores).
- Voz → observação.
- Papel "AEE externo" com acesso restrito à criança (experimento antes).
- Exportação completa por escola/criança; política de retenção; região do banco/transferência internacional documentada; DPA atualizado; avaliação de impacto de IA (CNE).
- Preço público e cobrança por PIX/boleto; página de preços com 3 hipóteses.
- Multi-unidade simples (uma coordenação geral vê várias escolas).
- Lazy-load do bundle; mobile nas telas do wedge.

## LATER — 6–12 meses (moat, integrações, superfícies)

- Integrações: SSO Google (se não entrou no NOW), API iScholar, CSV padrão Sponte/Activesoft, hubs Layers/Agenda Edu.
- Classroom Copilot (meta → sugestão semanal) se o experimento validar.
- Família contribuindo observação de casa (com consentimento por finalidade).
- Biblioteca agregada de metas/estratégias (sem PII; base legal clara).
- Financeiro/Asaas para escolas que pedirem (já construído).
- Portfólio da criança (exportável) como argumento de matrícula.
- Bett Brasil 2027 com cases.

## DO NOT BUILD YET

- Financeiro em produção, Stripe self-serve, régua de cobrança.
- E7 cuidado (saúde/ocorrências/autorizações).
- App nativo, offline.
- Inteligência pedagógica expandida, copiloto de planejamento, histórico escolar, diário impresso.
- Chat/comentários abertos com a família.
- Benchmarks entre escolas.
- Venda para redes públicas.
- Qualquer feature cujo valor seja "gera texto".

---

## Experimentos (Fase 23) — antes de construir grande

```
E1 — Entrevistas de coordenação
Hypothesis: em escolas com 3+ crianças acompanhadas, o PEI é feito no Word em fev, raramente atualizado, e a coordenação reescreve relatórios à noite.
Target user: 10 coordenadoras de escolas EI+Fund I privadas (Vale do Paraíba + rede de contatos).
Prototype: roteiro de 30 min; pedir para mostrar o PEI atual e a planilha de controle.
Time/cost: 2 semanas; R$ 0.
Metric: % que relata (a) PEI não atualizado, (b) horas/bimestre em relatórios, (c) uso de ChatGPT.
Success threshold: ≥ 7/10 com (a); mediana de (b) ≥ 8 h.
What we learn: se a dor do wedge é real e como ela é descrita (vocabulário para copy).
Decision if successful: seguir NOW.
Decision if unsuccessful: reconsiderar wedge para relatório descritivo (todas as crianças) primeiro.
```

```
E2 — Concierge PEI vivo (sem software novo)
Hypothesis: se a professora receber no WhatsApp "o que observar esta semana" e puder responder com texto/foto, ela registra ≥ 2×/semana, e a coordenação valoriza o resumo bimestral.
Target user: 2 escolas, 3 crianças cada.
Prototype: PEI estruturado à mão (metas em planilha); mensagens semanais manuais; resumo de progresso escrito por mim a partir dos registros.
Time/cost: 4 semanas; ~6 h/semana.
Metric: registros/semana por professora; nota da coordenação (1–5) ao resumo; "pagaria?".
Success threshold: ≥ 2 registros/semana em 3 das 4 semanas; nota ≥ 4; ≥ 1 escola diz que pagaria.
What we learn: se o loop evidência → progresso funciona antes de codar.
Decision if successful: construir itens 1, 3, 8 do NOW com confiança.
Decision if unsuccessful: o atrito está no registro; investir em voz/WhatsApp antes de UI.
```

```
E3 — Landing "PEI vivo" com o decreto
Hypothesis: coordenadoras/donas convertem para lista de espera a partir da mensagem "atualização contínua exigida pelo Decreto 12.773".
Target user: tráfego orgânico + envio direto para 100 escolas.
Prototype: página com template de PEI de referência baixável em troca de e-mail.
Time/cost: 1 semana; R$ 0 (reaproveitar motor de artigos da Althion).
Metric: taxa de download; respostas ao e-mail de follow-up.
Success threshold: ≥ 10% download; ≥ 5 conversas agendadas.
What we learn: força do gatilho regulatório e vocabulário.
Decision if successful: usar como canal principal de topo de funil.
Decision if unsuccessful: gatilho não vende; ancorar em "relatórios em uma tarde".
```

```
E4 — Teardown do Vínculo
Hypothesis: o Vínculo não liga observações da regente a metas nem gera relatório descritivo para todas as crianças.
Target user: eu + 1 coordenadora.
Prototype: trial/demo do Vínculo; checklist da matriz competitiva.
Time/cost: 1 semana.
Metric: checklist preenchido com evidência.
Success threshold: confirmar ≥ 3 diferenças defensáveis.
What we learn: se o wedge ainda é white space.
Decision if successful: manter posicionamento #3.
Decision if unsuccessful: reposicionar para relatório descritivo + coordenação (fora da inclusão).
```

```
E5 — Relatório com origem vs ChatGPT (teste cego)
Hypothesis: coordenadoras preferem relatório gerado de observações reais com citação a um relatório do ChatGPT a partir da mesma ficha.
Target user: 5 coordenadoras; 5 crianças (com consentimento) por escola piloto.
Prototype: dois relatórios por criança, sem identificar origem.
Time/cost: 2 semanas após item 4 do NOW.
Metric: preferência; nota de "confiança" e "individualização".
Success threshold: ≥ 70% preferem o nosso; confiança ≥ +1 ponto.
What we learn: se a evidência é diferencial percebido.
Decision if successful: é o argumento central de venda.
Decision if unsuccessful: a citação não é percebida; investir no ciclo e na auditoria como argumento.
```

```
E6 — Importação de PEI antigo
Hypothesis: 80% dos PEIs em Word/PDF viram estrutura (metas, estratégias) aceitável com ≤ 5 min de revisão.
Target user: 10 PEIs reais anonimizados (das entrevistas E1).
Prototype: script com LLM + tela de revisão simples.
Time/cost: 1 semana.
Metric: % aceitos; tempo de revisão.
Success threshold: ≥ 8/10; ≤ 5 min.
What we learn: viabilidade do maior redutor de switching cost.
Decision if successful: item 2 do NOW.
Decision if unsuccessful: entrada por "8 perguntas do estudo de caso" em vez de importação.
```

```
E7 — Preço
Hypothesis: a oferta "inclusão" (R$ 249–349 + por criança) converte mais que "escola inteira" (R$ 4–7/criança).
Target user: visitantes da landing + 20 escolas em conversa.
Prototype: página de preços com 3 ofertas; pedido de demo por oferta.
Time/cost: 1 semana.
Metric: cliques/pedidos por oferta; objeções.
Success threshold: uma oferta com ≥ 2× a taxa das outras.
What we learn: modelo e faixa.
Decision if successful: adotar a vencedora como padrão; outra como upgrade.
Decision if unsuccessful: preço não é o gargalo; manter H3 híbrida.
```
