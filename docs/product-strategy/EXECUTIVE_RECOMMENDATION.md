# EXECUTIVE RECOMMENDATION — Althion Education

Data: 14/09/2026. Consolida `PRODUCT_AUDIT.md`, `COMPETITIVE_LANDSCAPE.md`, `PRODUCT_OPPORTUNITIES.md`, `SWITCHING_STRATEGY.md`, `GTM_STRATEGY.md` e `PRODUCT_ROADMAP.md`. Evidência bruta em `research/01–04` (código lido linha a linha; pesquisa de mercado com fontes e datas de acesso em 13/09/2026).

Legenda: **[EXISTENTE]** · **[PARCIAL]** · **[DOC]** documentado mas não implementado · **[HIPÓTESE]** · **[RECOMENDAÇÃO]** · **[MERCADO]** verificado · `INSUFFICIENT EVIDENCE`.

---

# Conclusão executiva

**O que temos.** Um SaaS multi-tenant com 24 páginas, IA no servidor, financeiro com Asaas, portal da família e marca por escola — e **nenhuma escola real**. Em cinco meses o produto ganhou amplitude de ERP; em nenhum momento ganhou profundidade no que a própria tese de mercado (`docs/MERCADO.md`) diz ser o diferencial: *"a IA escreve a partir do que você observou o bimestre inteiro"*. Hoje isso é um botão de copiar texto. O PEI, que virou obrigação legal com "atualização contínua" em dezembro de 2025, é um markdown sem metas rastreáveis. Há três furos de segurança que permitem a um professor virar admin, a uma escola se dar plano ilimitado e a um autor aprovar o próprio documento.

**O que o mercado diz.** [MERCADO] O Decreto 12.773/2025 tornou PAEE e PEI obrigatórios, derivados de estudo de caso, com atualização contínua e com a finalidade de orientar a sala de aula comum — sem exigir laudo. Matrículas de TEA cresceram 44% ao ano (919 mil em 2024; ~1,3 mi em 2025). O CNE aprovou em 01/09/2026 diretrizes que classificam "perfilamento acadêmico individualizado" por IA como risco alto, exigindo avaliação de impacto, revisão humana e registro. Nenhum SIS brasileiro (Sponte, Activesoft, iScholar, Proesc) tem PEI ou IA que redija relatório. "Gerar PEI com IA" já é commodity (AEE Pro, PontoPEI, IncludED, iPsy, ChatGPT). O líder do nicho é o Vínculo (356 escolas, ~R$ 25/aluno acompanhado/mês, IA com atribuição de fonte, silo de inclusão). A Somos entrega PEI com IA de graça para 8,3 mil escolas parceiras. Internacionalmente, ninguém fecha o ciclo *observação da sala comum → meta do PEI → relatório periódico → família* com trilha de evidência.

**O que fazer.** Parar de construir amplitude. Escolher o wedge **"PEI vivo, baseado em evidência da sala comum"**: o PEI como objeto com metas mensuráveis; a observação de 20 segundos da professora regente ligada à meta; o relatório de progresso e o relatório descritivo gerados *a partir* dessas evidências, com citação de origem, revisados num ciclo completo (devolver, aprovar, versão, notificar) e auditáveis. Entrar pela importação do PEI em Word que a escola já tem (valor em 15 minutos). Coexistir com o ERP e com o app da família em vez de substituí-los. Expandir da inclusão para todas as crianças pelo mesmo motor de evidência. Não deployar o financeiro; parquear E7; corrigir a segurança antes da primeira escola.

**Por que uma escola muda de comportamento.** Motivo econômico: obrigação nova sem orçamento extra, ticket abaixo do "sob consulta" dos ERPs, sem fidelidade. Motivo operacional: 25 relatórios em uma tarde com origem, PEI que sabe o que aconteceu desde fevereiro, professora que sabe o que observar. Motivo pedagógico: documentação que reflete a criança real e orienta a sala, não um texto genérico. Por que não volta: cada bimestre acumula metas, evidências e versões que não existem em lugar nenhum — e que a família, o MP e o CNE podem pedir.

**Veredito de investidor.** O produto atual **não** é competitivo como está: é um ERP-lite com IA acoplada contra incumbentes com migração grátis. A *tese* de entrar pelo trabalho pedagógico está certa; a *execução* foi para o lado errado (paridade antes de diferencial). O timing regulatório é raro e favorável. O risco principal é o Vínculo executar a mesma tese com escala; a defesa é sair do silo da inclusão e chegar à escola inteira pelo mesmo fluxo. Recomendo 90 dias de foco absoluto no wedge com 3–5 escolas piloto antes de qualquer outra frente.

---

# 1. Current State

- Stack: React/Vite/TS, Vercel functions, Supabase (Postgres/Auth/Storage). Produção em althioneduapp.vercel.app. 24 páginas, 8 endpoints, 22+ tabelas com RLS, 4 planos, 4 papéis. **[EXISTENTE]**
- Zero escolas reais; uma demo. Os 4 últimos commits (auditoria UX, design system, financeiro/Asaas, observações/períodos/PEI com ciclo) estão **só no checkout local**, sem push e sem deploy. E7 (cuidado) é migração não aplicada + componentes órfãos que quebram o typecheck. **[EXISTENTE]**
- IA: 4 prompts (relatório, PEI, análise de prova, planejamento); só primeiro nome sai; **diagnóstico da criança sai em texto livre**; prompt do PEI pede "perfil técnico baseado no diagnóstico"; sem citação de evidência, sem RAG, sem versionamento persistido, sem guardrail clínico. **[EXISTENTE]**
- Observações (E6): melhor fluxo do produto (4 toques, câmera, campo BNCC). Entram no relatório por copy-paste; **não entram no PEI**. **[PARCIAL]**
- PEI: markdown; sem objeto "meta"; ciclo enviar→aprovar sem "devolver". **[PARCIAL]**
- Ciclo de revisão: sem devolver, comentário, versão ou notificação (só planos de aula têm devolução). **[PARCIAL]**
- Notificações, exportação LGPD, retenção, audit trail: **[DOC]** ou inexistentes.
- Segurança: 9 gaps de RLS, 3 graves. Banco aparentemente em us-west. DPA incompleto.
- TTFV: 2–4 h de setup; diferencial só aparece semanas depois.

# 2. Market

[MERCADO] ~42 mil escolas privadas de educação básica (2024); ~24 mil com Educação Infantil e ~15 mil com anos iniciais; 9,5 mi matrículas privadas; creche é a etapa mais privatizada (33%). Educação especial: 2,5 mi matrículas (2025), 96% em classes comuns, só 45,8% com AEE; TEA ~1,3 mi (+41% em 2025). Recorte de educação especial na rede privada: `INSUFFICIENT EVIDENCE` (exige microdados).

Regulação: Decreto 12.686/2025 (PNEEI) + Decreto 12.773/2025 (PEI obrigatório, estudo de caso, atualização contínua, orienta sala comum, sem laudo para apoio; formação AEE 360 h). Sem conteúdo mínimo normatizado de PEI. PEI é documento aceito no Censo. CNE (01/09/2026): IA de perfilamento individualizado = risco alto. ANPD 2026–27: crianças + IA como eixos. ECA Digital em vigor desde 03/2026. Alcance do decreto sobre escolas privadas: validar juridicamente antes de usar em copy.

Carga docente: TALIS 2024 Brasil 40,3 h/semana; preparação 9,3 h; correção 6,1 h; 21% "muito estressados". Horas específicas em PEI/relatórios: `INSUFFICIENT EVIDENCE` (só claims de vendors).

# 3. Competitors

| Grupo | Quem | Estado |
|---|---|---|
| Inclusão/PEI (B2B) | **Vínculo** (356 escolas, R$ 25/aluno, IA com fonte, apps, família), IncludED (R$ 315–560/mês), AEE Pro (R$ 199,90/mês escola), PontoPEI, PAMI/Mosaico (B2G) | referência: Vínculo |
| PEI cativo | **Somos/Plurall** (8,3 mil escolas), Arco (assistente OpenAI) | excluir Somos do ICP |
| Geradores B2C | PEI Digital, iPsy, Pluma, PEIA, IA Inclusiva | commodity |
| Documentação EI | **Memoz** (340 inst.), Diário Escola (1.500), Kinderpedia, Beibee | concorrem em observação → resumo |
| SIS/ERP | Sponte (5.200), Activesoft, iScholar (API), Proesc, Sophia, Escolaweb, Gennera | sem PEI, sem IA pedagógica; coexistir |
| Comunicação | Arco/ClassApp, Bemobi/Agenda Edu (3.500), Layers (1.800) | sem registros pedagógicos; coexistir |
| Internacional | Storypark, Kinderpedia (obs → resumo); AbleSpace, Panorama (dados → metas); Frontline/PowerSchool/Embrace (IEP + IA de rascunho) | ninguém fecha o ciclo completo |
| IA horizontal | ChatGPT (grátis K-12 EUA até 2028), Gemini (incluído no Workspace), Copilot | commodity de redação; sem workflow/evidência/auditoria |

11 dos 16 concorrentes do briefing não existem de forma verificável.

# 4. Commodities

Gerar texto de PEI/relatório/plano com IA; agenda/comunicados/mural; frequência/notas/boletim; portal da família; boleto/PIX. Nada disso decide uma compra.

# 5. White Spaces

1. PEI como plano vivo da sala comum (decreto exige; ninguém entrega).
2. Documentação com evidência para todas as crianças, com inclusão como "metas a mais", não como silo.
3. Migração inteligente de documentos antigos (Word/PDF → estrutura).
4. Padrão de fato de conteúdo do PEI (não há norma).
5. Trilha de auditoria de IA conforme CNE/ANPD, publicada como artefato.

# 6. ICP

Escola privada de 80–300 alunos, Educação Infantil + Fundamental I, dirigida por pedagoga (mantenedor = diretor), com 3–15 crianças acompanhadas, sem sistema Somos, que já usa Word/Docs para PEI e relatórios e tem ERP ou app de família que **não** vai trocar. Champion: coordenação. Buyer: dona/mantenedor (decide em 10–30 dias). Daily user: professora regente. Canal: profissional de AEE itinerante e formadores. Excluir: redes públicas, escolas Somos, quem exige substituir o ERP.

# 7. JTBD

- Coordenação: *"garantir que cada criança tenha PEI e relatório de qualidade, no prazo, sem eu reescrever tudo à noite — e ter o que mostrar à família e a quem cobrar."*
- Professora regente: *"saber o que observar e não ter de escrever 25 relatórios do zero."*
- AEE: *"fazer o estudo de caso e o PEI e conseguir que a regente use."*
- Mantenedor: *"não ter problema jurídico com inclusão e não perder professora nem matrícula."*
- Família: *"ter prova de que a escola está cuidando do meu filho."*

# 8. Killer Wedge

**PEI vivo, baseado em evidência da sala comum**, com relatório descritivo de todas as crianças como expansão imediata pelo mesmo motor. Poucas crianças por escola (implantação pequena), gatilho legal datado, champion clara, cria dado proprietário desde o dia 1, sai do silo do AEE, coexiste com o ERP. Não é "IA para gerar PEI" (commodity) nem "sistema completo" (guerra perdida).

# 9. 10x Experience

- **"O PEI que sabe o que aconteceu desde fevereiro"**: cada meta com suas observações (data, autora, foto), status e relatório de progresso em um clique.
- **"25 relatórios em uma tarde, cada parágrafo com origem."**
- **"Do Word para o plano em 5 minutos."**

# 10. Differentiation

Metas como objetos rastreáveis ligadas a observações da regente; citação de evidência e sinalização de lacunas; ciclo completo com versões e notificação; auditabilidade conforme CNE/ANPD; um fluxo para todas as crianças; coexistência com o SIS. Regra: **nenhum investimento em IA cujo valor seja "escreve texto"**.

# 11. Switching Strategy

Land-and-expand, não rip-and-replace. Reduzir 80% do custo de troca com: importação de PEI/relatórios antigos (Word/PDF → estrutura), planilha de alunos (existe) + exportações de ERPs, SSO Google, self-serve, concierge nas primeiras 20, coexistência com ERP e app da família, exportação total a qualquer momento, sem fidelidade, preço público. Privacidade como argumento *a favor* da troca (a escola que cola diagnóstico no ChatGPT está trocando para algo mais seguro) — só se corrigirmos os gaps primeiro.

# 12. Product Moat

Principal: **histórico longitudinal por criança** (metas, evidência, versões, decisões), que cresce a cada bimestre e não é copiável. Secundários: workflow no ritmo da escola; trilha de auditoria regulatória; marca/confiança ("dados no Brasil, sem laudo para a IA, revisão humana documentada"); biblioteca agregada de metas/estratégias (12+ meses, com cuidado de privacidade); integrações. A IA não é moat.

# 13. GTM

Founder-led direto nas primeiras 20 escolas (base de 171 escolas do Vale do Paraíba já levantada); AEE itinerantes e formadores como canal; conteúdo com o decreto e o parecer do CNE (template de PEI de referência); comunidades de coordenação; parceiros Google for Education; sistemas de ensino sem PEI (Positivo, SAE, Bernoulli) só com 10+ cases; Bett Brasil 4–7/05/2027 só com cases. Janela de compra: ago–out para o ano seguinte; fev–mar (matrículas com laudo); fechamentos de bimestre. Sem tráfego pago antes de 5 referências.

# 14. Pricing Hypotheses

[HIPÓTESE] Não medir IA. Sem fidelidade. PIX/boleto manual até 20 escolas.
- H1 "Inclusão": R$ 249–349/mês por escola com até 5 crianças acompanhadas + R$ 19–29/criança adicional (referências: IncludED R$ 315–560; Vínculo ~R$ 25/aluno).
- H2 "Escola inteira": R$ 4–7/criança/mês (todas), mínimo R$ 349 (referências: Beibee R$ 7,90; Storypark US$ 1,79).
- H3 híbrido: H1 para entrar, H2 ao ativar relatórios de todas.
Teste com página de preços (experimento E7).

# 15. Product Roadmap

- **NOW (0–3 meses)**: (0) segurança + build verde + deploy sem financeiro; (1) metas do PEI como objeto + versões; (2) importar PEI antigo; (3) observação ↔ meta + "o que observar esta semana"; (4) relatório/PEI com citação de evidência; (5) ciclo completo + notificação; (6) convite/SSO/self-serve; (7) guardrails e diagnóstico fora do prompt; (8) relatório de progresso para a família; (9) piloto com 3–5 escolas.
- **NEXT (3–6)**: relatório de todas as crianças + mapa BNCC; importar relatórios antigos; quality guardrails; voz; AEE externo; exportação/retenção/região; preço público; multi-unidade; lazy-load.
- **LATER (6–12)**: integrações (iScholar, Layers, Agenda Edu), Classroom Copilot, família contribuindo, biblioteca agregada, financeiro para quem pedir, Bett 2027.
- **NÃO CONSTRUIR AGORA**: financeiro em produção, Stripe, E7, app nativo, inteligência pedagógica, copiloto de planejamento, histórico escolar, chat com família, benchmarks, redes públicas.

# 16. Experiments

E1 entrevistas (10 coordenadoras); E2 concierge PEI vivo por WhatsApp (2 escolas, 4 semanas); E3 landing com o decreto + template; E4 teardown do Vínculo; E5 relatório com origem vs ChatGPT em teste cego; E6 importação de 10 PEIs reais; E7 página de preços. Detalhes e critérios em `PRODUCT_ROADMAP.md`.

# 17. Risks

1. **Vínculo** executa a mesma tese com escala e LLM próprio → defesa: escola inteira, coexistência, relatório descritivo; fazer E4 antes de copy comparativa.
2. **Somos/ERPs bundlando PEI** → excluir Somos do ICP; profundidade (metas + evidência + ciclo) em vez de feature.
3. **CNE risco alto** → custo de compliance (avaliação de impacto, registro) — transformar em argumento; fazer o artefato.
4. **Alcance do decreto sobre privadas** incerto → não vender por medo sem validação jurídica.
5. **Burocratizar a professora** → registro ≤ 20 s, metas ≤ 5, IA nunca marca progresso.
6. **Dados de crianças fora do Brasil, gaps de RLS, diagnóstico no prompt** → corrigir antes da primeira escola; senão o argumento de privacidade vira passivo.
7. **Fundador solo com múltiplos projetos** → roadmap estreito; critério de saída do NOW explícito.
8. **Ticket baixo no wedge** → expansão para escola inteira é obrigatória, não opcional.

# 18. Final Recommendation — respostas diretas (Fase 21)

1. **O produto atual é competitivo?** **NO** como está (ERP-lite com IA acoplada, sem cliente, com furos de segurança e diferencial raso). **PARTIALLY** como base técnica: multi-tenant, IA no servidor, fluxo de observações e velocidade de construção são ativos reais.
2. **Maior fraqueza**: amplitude sem profundidade — o diferencial declarado (evidência → documento) é um copy-paste, e o PEI não tem metas; somado a zero usuários reais e 3 furos graves de RLS.
3. **Maior ativo**: o fluxo de observação em 4 toques + a base multi-tenant + o timing regulatório (decreto de 12/2025 e parecer do CNE de 09/2026) que ninguém no mercado converteu em produto.
4. **ICP inicial**: escola privada de 80–300 alunos, EI + Fund I, dirigida por pedagoga, com 3–15 crianças acompanhadas, fora da Somos, que mantém seu ERP.
5. **Killer wedge**: PEI vivo baseado em evidência da sala comum, expandindo para relatórios de todas as crianças.
6. **Principal diferencial**: metas rastreáveis ligadas às observações da regente, com citação de evidência, ciclo completo e auditoria — para todas as crianças, não só a inclusão.
7. **Principal 10x moment**: "O PEI que sabe o que aconteceu desde fevereiro."
8. **O que faz uma escola trocar**: o Word vira plano em 5 minutos; 25 relatórios em uma tarde com origem; obrigação legal cumprida com prova; sem fidelidade; coexiste com o que já tem.
9. **O que faz ficar por anos**: o histórico da criança (metas, evidência, versões) que não existe em outro lugar e que a família, o MP e a coordenação seguinte vão pedir; o ritmo do bimestre embutido.
10. **Moat**: histórico longitudinal por criança + workflow no ritmo da escola + auditabilidade regulatória; depois, biblioteca agregada e integrações.
11. **Maior risco estratégico**: continuar construindo paridade (financeiro, cuidado, agenda) e ser um "sistema" a mais — enquanto o Vínculo fecha o nicho e os ERPs adicionam PEI.
12. **Feature que parece boa mas não construir**: **financeiro/Asaas em produção** (e Stripe). Está pronto e bem feito; deployar agora coloca o produto na prateleira errada. Fica em branch.
13. **Feature pouco óbvia que pode mudar o jogo**: **importação de PEI/relatório antigo (Word/PDF → metas e estrutura)**. Derruba a maior barreira de troca, dá valor em 5 minutos e alimenta o histórico desde o dia 1.
14. **Substituir ERP/SIS ou integrar?** **Integrar/coexistir.** O ERP fica com matrícula, financeiro e secretaria; nós somos a camada pedagógica com evidência. Financeiro só se a escola pedir, depois.
15. **Categoria**: nem "PEI", nem "inclusão", nem só "documentação": **documentação pedagógica com evidência** ("student evidence layer"), com a inclusão como porta de entrada e a escola inteira como destino.

---

*Este documento e os seis que o sustentam estão em `docs/product-strategy/`. Evidência bruta em `docs/product-strategy/research/`. Pesquisa de mercado realizada em 13/09/2026; itens sem evidência suficiente estão marcados e devem ser fechados antes de uso externo.*
