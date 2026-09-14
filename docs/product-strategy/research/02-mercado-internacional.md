# Apêndice de pesquisa — mercado internacional (IEP/SpEd, IA para professores, documentação pedagógica, MTSS, comunicação, IA horizontal)

Data da pesquisa: 13/09/2026. Todas as URLs abaixo foram acessadas em 13/09/2026.
Legenda: **[V]** = INFORMAÇÃO DE MERCADO VERIFICADA (lida na fonte primária ou em reportagem/documento citado); **[I]** = inferência ou dado de terceiro não confirmado na fonte primária; `INSUFFICIENT EVIDENCE` = não encontrado.

Observação de método: várias páginas oficiais bloquearam fetch (403): CDT brief PDF, RAND relatório, OECD TALIS full report. Para esses, os números vêm de reportagens que citam a fonte (EdWeek, NPR, Gallup, Education International), marcado explicitamente.

---

## 1. Tabela por produto

| Nome | Cat. | Verif.? | O que faz | Buyer/ICP | IA? | Obs→doc? | Goal tracking? | Família? | Preço | Tração | Fonte |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **SpedZen** (TalliQ) | A | [V] site | Extensão Chrome que roda "por cima" de SpEd Forms, Google Classroom e Schoology; lê o IEP do aluno e gera tarefas diferenciadas por meta, provas CBM com correção automática, relatórios de progresso "data-backed" e calendário de compliance. De-identificação estrutural antes de enviar à IA; dados ficam no dispositivo | Professor de ed. especial EUA (individual) | Sim (Claude via API key do próprio usuário) | Parcial: gera relatório a partir de dados de progresso CBM, não de observações livres | Sim (metas do IEP → checks → relatório) | Não visto | US$ 89/ano escolar, seats ilimitados + custo de API pago à Anthropic; tiers Pro/Campus/District "a caminho" | Sem números; produto novo | https://spedzen.com/ |
| **Frontline Special Ed Management** (ex-IEP Direct) | A | [V] | Plataforma distrital de IEP/504/MTSS/ELL: formulários estaduais, validação no ponto de entrada, "compliance button", SIS integration, Medicaid | Distritos K-12 EUA | Sim: **IEP Goal Writer** (rascunho de metas alinhadas a padrões), anunciado 22/04/2026 | Não | Sim (compliance/goal management) | Não detalhado | Cotação | "10.000+ organizações K-12" (todos os produtos Frontline) | https://www.frontlineeducation.com/news/frontline-education-accelerates-ai-innovation-across-k-12-with-new-advisory-council-and-strategic-partnership/ ; https://www.frontlineeducation.com/special-programs/special-ed-software/iep-management/ |
| **PowerSchool Special Programs + PowerBuddy** | A | [V] docs | IEP/504/ELL/Gifted/Service Capture/assinatura digital; **IEP Goal Generator** (série, padrão, área → metas mensuráveis) | Distritos K-12 (SIS PowerSchool) | Sim (PowerBuddy: templates de planos, metas e progress monitoring) | Não documentado | Sim (módulo) | Sim (PowerBuddy family-facing, 03/2025) | Cotação | Não divulgado | https://sp-programs.powerschool-docs.com/special-programs-sys-admin/latest/iep-goal-generator ; https://www.powerschool.com/products/student-information/special-programs/ |
| **SameGoal** | A | [V] site | IEP, 504, EL, RTI/MTSS, K-4 Literacy com formulários estaduais; pais visualizam e assinam pelo celular; tradução automática; integração SIS | Distritos K-12 | `INSUFFICIENT EVIDENCE` para IA | Não | Sim (progress reporting) | Sim (visualizar/assinar) | Cotação | Sem número agregado | https://www.samegoal.com/ ; https://samegoal.com/sm/special-education |
| **Embrace (Everway)** | A | [V] | EmbraceIEP/504/DS/MTSS/Eval; goal builder com pistas (timeframe/behavior/condition/criterion); batch print de progress reports; tradução | Distritos K-12 | Sim, via Everway/Polaris: "AI-assisted goal writing based on identified student needs", "AI-assisted present level writing using profile results" (padrão desde 22/06/2026) | Parcial: present levels a partir de "profile results" | Sim | Não detalhado | Cotação | "1.100+ distritos", "98% retenção" (LinkedIn) [I] | https://www.everway.com/solutions/iep-solutions/ ; https://www.everway.com/product-news/updates/polaris-standard-experience/ |
| **Panorama Education / Solara** | A/D | [V] | Student Success (dados acad./freq./comportamento) + MTSS/intervenções + **Solara** (IA "grounded" nos dados do distrito). Solara sintetiza dados do aluno para rascunhar PLAAFP, impact statements, metas e seções de relatórios de avaliação | Distritos K-12 | Sim | **Sim — o mais próximo de "evidência → plano"**: metas "grounded in current student data"; dados de sistema, não observações narrativas | Sim (interventions dashboard) | Não é o foco | Cotação | "2.000+ distritos, 15 mi alunos"; Mesquite ISD: IEP de 2–3 h → ~45 min; "73% economizam 4+ h/sem"; "520.000 h economizadas em 2024-25" (claims da empresa) | https://www.panoramaed.com/who-we-serve/teachers-students ; https://www.panoramaed.com/blog/mesquite-isd-special-education ; https://www.panoramaed.com/special-education-texas |
| **Goalbook Toolkit + Threads** | A | [V] | Banco de metas em 17 áreas + estratégias UDL; **Threads** (IA) conecta present levels → metas → SDI; piloto Anne Arundel County, primavera 2025 | Distritos e professores | Sim | Não | Não (autoria, não tracking) | Não | US$ 32,95/mês individual; distrito a partir de ~US$ 5.000 (terceiros) [I] | "1.100+ distritos"; "83.000+ professores" [I] | https://goalbook.com/leadership/iep-development-and-educator-effectiveness-goalbook-threads/ ; https://goalbook.com/explore-toolkit/ |
| **Ori Learning** (ex-OneDer) | A | [V] | Currículo de transição/SEL para 9º–12º e 18–22 anos com dados de progresso | Distritos, ensino médio | `INSUFFICIENT EVIDENCE` | Não | Parcial | Não | Cotação | Não divulgado | https://orilearning.com/ |
| **MagicSchool — IEP Generator** | A/B | [V] | Entra série, categoria de deficiência, present levels e áreas → rascunha needs/impact statement, metas mensuráveis, acomodações. Também Report Card Comment Generator, Behavior Plan, Accommodation Suggester; "80+ ferramentas" | Professores (free/Plus) e distritos (Enterprise) | Sim | Não: parte do que o professor digita | Não | Não | Free; Plus US$ 8,33/mês anual ou 12,99 mensal; Enterprise custom (DPA, SSO, SIS/LMS) | "7 mi+ educadores, 160 países, 13.000+ escolas" [I terceiros] | https://www.magicschool.ai/pricing ; https://www.magicschool.ai/tools/iep-generator ; https://www.magicschool.ai/tools/report-card-comments |
| **Playground IEP** | A | [V] site | Caseload + "IEP Copilot": Goal Writer SMART, PLAAFP Feedback Coach, Disability Impact, BIP Writer, avaliações de progress monitoring geradas por IA | Professores e distritos | Sim | Não | Parcial | Não | Free; Pro US$ 10/mês; escola/distrito US$ 12/mês por prof. de ed. especial | "12.000+ professores" (KIPP, CPS, Rocketship, TFA) | https://www.playgroundiep.com/ |
| **AbleSpace** | A | [V] site | Coleta de dados de metas (10+ tipos de medida), mastery automático, trendlines, **logs diários de observação**, notas de sessão por voz com IA, **"AI-powered progress notes" geradas dos dados**, dashboard de família, sync com IEP | Terapeutas/SpEd | Sim | **Sim: observações/dados → notas de progresso** (o caso mais próximo do "living IEP") | Sim (núcleo) | Sim (family dashboard) | Free tier; pago desbloqueia IA | "50.000+ educadores, 300+ escolas" | https://www.ablespace.io/ |
| Outros geradores IEP com IA (2025–26) | A | [V] lista | Sped.AI (US$ 20/mês; distritos 2.500–5.000/ano), AISPED (49,90/mês), Spedsternow/IEP Companion, Monsha, GoalGenius.ai, fastIEP (progress monitoring) | Indivíduos | Sim | Não | Alguns (fastIEP) | Não | Free a ~US$ 50/mês | Sem números | https://aitoolsbakery.com/blog/best-ai-iep-writing-tools/ ; https://sped.ai/pricing.html ; https://aisped.org/pricing ; https://fastiep.com/ |
| **Brisk Teaching** | B | [V] terceiros | Extensão Chrome/Edge no Google Docs/Word: 4 tipos de feedback, inline feedback com "voz do professor" (2026), planos, quizzes | Professores; distritos | Sim | Não (feedback sobre trabalho do aluno) | Não | Não | Free; Pro US$ 99,99/ano; distrito custom | `INSUFFICIENT EVIDENCE` | https://www.edusageai.com/blogs/brisk-teaching-pricing-for-schools-and-districts-in-2026 ; https://aitoolsbakery.com/blog/brisk-teaching-updates-2026/ |
| **Diffit** | B | [V] terceiros | Nivelamento/diferenciação de textos | Professores; escolas | Sim | Não | Não | Não | Free; US$ 14,99/mês ou 149,99/ano | — | https://www.kuraplan.com/reviews/diffit-review |
| **Eduaide.ai** | B | [V] terceiros | 75–120+ geradores incl. IEP goals e acomodações | Professores | Sim | Não | Não | Não | Free (15/mês); Pro US$ 5,99/mês ou 49,99/ano | — | https://aieducator.tools/eduaide-ai |
| **SchoolAI** | B | [V] site | "Spaces" para alunos, ferramentas para professor, rostering SIS, insights por aluno | Distritos | Sim | Não | Não | Não | Não publicado; terceiros ~US$ 5–10/aluno/ano [I] | ESSA Level III (claim) | https://schoolai.com/pricing |
| **Khanmigo for Teachers** | B | [V] | Planos, rubricas, "progress summaries" ligadas ao conteúdo Khan | Professores | Sim | Não | Não | Não | Grátis para professores; US$ 4/mês famílias | — | https://www.khanmigo.ai/pricing |
| **Gemini for Education / Google Classroom** | B/F | [V] Google | "Help me write" para feedback sugerido em comentários privados (19/02/2026); Gemini em Docs/Slides/Forms; Gemini no Classroom para todas as idades (08/2026); Common Sense Privacy Seal; não treina com conteúdo de alunos | Escolas Workspace | Sim | Não como produto (Docs + Gemini permite "gere relatório" ad hoc) | Não | Não | Incluído em Education Plus / add-on | Base Workspace | https://workspaceupdates.googleblog.com/2026/02/educators-now-get-help-drafting-personalized-guidance-on-written-assignments-with-AI.html ; https://workspaceupdates.googleblog.com/2026/08/gemini-in-google-classroom-is-expanding-to-users-of-all-ages-with-contextualized-Gemini-starter-prompts-for-students.html ; https://privacy.commonsense.org/evaluation/Gemini-in-Google-Workspace-for-Education |
| **Microsoft 365 Copilot for Education / Teams** | B/F | [V] terceiros | Módulo "Teach", Excel "performance reports for parent conferences", Teams resumo de reuniões, Education Insights "student support cards" | Escolas M365 | Sim | Não como produto | Não | Não | A1 grátis (Copilot Chat + Teach); add-on US$ 18/usuário/mês | — | https://www.educatorstechnology.com/2026/02/microsoft-copilot-for-education.html ; https://techcommunity.microsoft.com/blog/EducationBlog/what%E2%80%99s-new-in-microsoft-edu---23-new-features-for-iste-2026/4516294 |
| **ChatGPT for Teachers / ChatGPT Edu** | B/F | [V] OpenAI | Workspace com proteções "education-grade", admin controls, não treina por padrão; **grátis para K-12 dos EUA até 06/2028** | Professores K-12 EUA | Sim | Não | Não | Não | Grátis (K-12 EUA); Edu por contrato | — | https://help.openai.com/en/articles/12844995-chatgpt-for-teachers ; https://chatgpt.com/plans/k12-teachers/ |
| **Seesaw** | C/E | [V] | Portfólio K-5, mensagens à família, AI Assistants; **"Show What You Know"** (13/08/2026): corrige respostas abertas por rubrica e produz scores/summaries por aluno | Distritos/escolas Fund. I | Sim | **Parcial: evidência do aluno → insight de avaliação**, não relatório descritivo | Não | Sim (núcleo) | Freemium + custom; créditos de IA | "25 mi+ usuários" | https://www.einpresswire.com/article/934008679/seesaw-launches-ai-powered-assessment-experience-to-help-schools-turn-student-thinking-into-actionable-insight ; https://help.seesaw.me/hc/en-us/articles/42646607468045-Seesaw-Product-Updates-2026 |
| **Storypark (Storypark Assist)** | C | [V] help center | Learning stories/observações ligadas a currículo; **Assist**: Draft (perguntas guiadas → rascunho), Review, Writing tools, **Summary of Learning** (sintetiza histórias e notas da criança em resumo alinhado ao currículo, por outcome, com sliders de tom), "rolling out gradually" (fact sheet 01/07/2026). OpenAI + Anthropic via AWS Bedrock; não envia imagens/vídeos | Centros de EI (AU/NZ/CA/UK) | Sim | **SIM — observações → resumo de aprendizagem** | Não (outcomes de currículo, não metas individuais) | Sim | US$ 1,79/criança/mês (1,59 anual); Assist é add-on | "11.000+ centros em 37 países" [I] | https://help.storypark.com/en/articles/10137042-educators-storypark-assist ; https://help.storypark.com/en/articles/10114616-storypark-assist-fact-sheet ; https://www.capterra.com/p/152602/Storypark/ |
| **Tapestry** (Foundation Stage Forum) | C | [V] site | Learning journal EYFS→Y6: observações (foto/vídeo/áudio), flags e avaliações por framework, relatórios por template, pais contribuem observações | Escolas/nurseries UK | **Nenhuma IA mencionada** | Não | Não | Sim | Não publicado | "14.000 settings, 40 países" [I] | https://tapestry.info/features/online-learning-journals/ |
| **Educa (Educa Assist)** | C | [V] | Portfólios, learning stories, frameworks; Assist: refinamento/validação/tradução da escrita; dados apagados em 30 dias | Centros EI (NZ/AU/US) | Sim (assistente de escrita) | Não | Não | Sim | US$ 1,29/criança/mês (mín. 15) | "300.000+ usuários" | https://www.geteduca.com/educa-assist/ ; https://www.geteduca.com/pricing/ |
| **Brightwheel** | C | [V] | Gestão de creche + observações com skill ratings por domínio, janelas de avaliação, Learning Report por criança/turma, portfólio automático; "AI operating partner"; Teacher AI Assistant, Admin AI | Creches/pré-escolas EUA | Sim | Parcial: relatórios compilam observações; geração narrativa por IA não confirmada | Sim (milestones) | Sim | Cotação | Não divulgado | https://mybrightwheel.com/back-to-school-2026/ ; https://help.mybrightwheel.com/en/articles/998639-learning-report ; https://help.mybrightwheel.com/en/articles/11899456-log-observations-to-assess-student-development |
| **Kinderpedia (Kinderpedia AI)** | C | [V] site | MIS + app pais + IA: mensagens, relatórios de incidente automáticos e **"Progress Reports: turn detailed observations into concise, parent-ready summaries in seconds"**; "coming soon": detecção de padrões/risco | Escolas/creches (Europa, 40+ países) | Sim | **SIM — observações → resumo para pais** | Parcial (milestones) | Sim | Professional €199/centro/mês; Business Plus cotação | "2.000+ escolas, 40+ países"; claim "6–9 h/sem economizadas" | https://www.kinderpedia.co/en/features/kinderpedia-ai ; https://www.kinderpedia.co/en/pricing |
| **Procare Solutions** | C | [V] parcial | Gestão de creche; relatório 2026 (04/03/2026): 39% dos provedores usam IA (+77% a/a) | Creches EUA | `INSUFFICIENT EVIDENCE` | Não | Parcial | Sim | Cotação | "~40.000 centros" | https://www.prnewswire.com/news-releases/procare-solutions-releases-2026-child-care-business-trends-report-302704060.html |
| **Lillio (ex-HiMama)** | C | [V] terceiros | Daily reports, observações ligadas a milestones, progress reports | Creches (CA/US) | Terceiros afirmam sem IA [I] | Não | Parcial | Sim | Cotação | — | https://www.softwareadvice.com/child-care/himama-profile/ |
| **Famly (Sidekick)** | C | [V] site | Plataforma EY; Sidekick: rascunho de mensagens, ditado por voz, tom; **não** gera relatório a partir de observações nem faz link EYFS | Nurseries/chains | Sim (assistente de escrita) | Não | Não | Sim | Não publicado | "1.000.000+ profissionais e famílias" | https://www.famly.co/platform/parent-partnerships/sidekick ; https://www.famly.co/blog/sidekick-for-all |
| **Kindertales** | C | [V] terceiros | Gestão de creche; observações com milestones; progress reports | Creches | `INSUFFICIENT EVIDENCE` | Não | Parcial | Sim | Não publicado | — | https://www.kindertales.com/ |
| **nursery.click** (UK, novo) | C | [V] site | "AI-native": foto da atividade → observação EYFS completa com áreas, next steps e links curriculares em <60 s | Nurseries UK | Sim | **SIM — foto → observação estruturada** | Não | Sim | £49–149/mês por nursery | Sem números (recém-fundada) | https://nursery.click/ |
| **Branching Minds** | D | [V] site | MTSS: dados → tiering → plano com metas SMART + biblioteca de intervenções → progress monitoring com Rate of Improvement → outcomes; Dottie AI | Distritos K-12 | Sim | Não (dados de avaliação) | **Sim — modelo "evidence → plan → action → outcome" explícito** | Não | Cotação | CPS, Wyoming DOE, San Antonio ISD + "40+ distritos" | https://www.branchingminds.com/mtss-platform-software-improve-academic-achievement |
| **Renaissance (FastBridge + eduCLIMBER)** | D | [V] | Screening/progress monitoring + dados "whole child" + intervenções | Distritos | `INSUFFICIENT EVIDENCE` para IA generativa | Não | Sim | Não | Cotação | — | https://www.renaissance.com/product_update/new-fastbridge-and-educlimber-integration-streamlines-intervention-and-progress-monitoring-workflows/ |
| **ClassDojo** | E | [V] | Comunicação/comportamento/portfólio; **Sidekick** (Claude): planos, materiais, mensagens, "draft report card comments with just a few words"; Dojo Tutor | Professores Fund. I (grátis) + famílias (pago) | Sim | Não (comentários curtos) | Não | Sim (núcleo) | Grátis para professores | "45 mi usuários, 180 países"; "90% das escolas de Fund. I dos EUA" | https://claude.com/customers/classdojo ; https://help.classdojo.com/hc/en-us/articles/28695578814989-What-is-Sidekick |
| **Bloomz** | E | [V] site | Comunicação em 250+ idiomas, PBIS, conferências; "Thrive" cruza frequência/comportamento/SEL | Escolas/distritos | Sim | Não | Não | Sim | A partir de US$ 3/aluno/ano | — | https://www.bloomz.com/bloomz-pricing |
| **Remind → ParentSquare** | E | [V] | ParentSquare adquiriu Remind (11/2023); ParentSquare Intelligence (03/2026) | Distritos | Sim | Não | Não | Sim | Cotação | "42.000+ escolas, 22 mi+ alunos" | https://www.parentsquare.com/blog/parentsquare-remind-a-new-chapter-and-whats-next/ |

---

## 2. Padrão ouro de IEP (IDEA, 34 CFR §300.320) — [V]

Texto verificado em https://sites.ed.gov/idea/regs/b/d/300.320:

- **(a)(1)** "A statement of the child's present levels of academic achievement and functional performance" (PLAAFP).
- **(a)(2)(i)** "A statement of measurable annual goals, including academic and functional goals…"
- **(a)(3)(i)** "How the child's progress toward meeting the annual goals… will be measured; and (ii) when periodic reports on the progress… will be provided."

O padrão ouro tem quatro peças encadeadas: **linha de base (PLAAFP) → meta mensurável → método de medição → relatório periódico de progresso**. A regulação não fixa formato nem frequência (https://www.parentcenterhub.org/iep-progress/) [V].

O que o mercado faz com isso:
- Sistemas distritais (Frontline, PowerSchool, SameGoal, Embrace/Everway) são **sistemas de registro e compliance**; a IA que adicionaram em 2025–26 é de **autoria de rascunho**.
- **Panorama Solara** é o único grande player que documenta rascunhar PLAAFP/metas "grounded in current student data" (dados de sistema, não observações narrativas).
- A camada de **coleta de dados de meta** (AbleSpace, fastIEP, SpedZen) é onde vive o progress monitoring real; AbleSpace já gera "AI-powered progress notes" dos dados coletados.
- Goalbook Threads ataca o problema de **coerência** entre present levels → metas → SDI.
- Referência de qualidade: Texas TEA Q&A sobre metas mensuráveis (02/2025): https://spedsupport.tea.texas.gov/sites/default/files/2025-02/qa-iep-measurable-annual-goals.pdf [V, não lido na íntegra].

**Inferência [I]:** nenhum dos produtos verificados fecha o ciclo "observação narrativa diária → evidência ligada à meta → relatório periódico gerado" de ponta a ponta; AbleSpace é o mais perto no lado quantitativo, Storypark/Kinderpedia no lado narrativo (sem metas individuais).

---

## 3. Quem já gera relatório a partir de observações (2025–2026)

**Confirmado [V]:**

| Produto | O que gera | Entrada | Limite |
|---|---|---|---|
| Storypark Assist — Summary of Learning | Resumo alinhado ao currículo por learning outcome, tom ajustável | Histórias e notas da criança (texto) | Rollout gradual; add-on pago; sem metas individuais/PEI |
| Storypark Assist — Draft | Rascunho de learning story via perguntas guiadas | Notas do educador | Idem |
| Kinderpedia AI — Progress Reports | "Turn detailed observations into concise, parent-ready summaries in seconds" | Observações registradas | Detecção de padrões "coming soon" |
| AbleSpace | "AI-powered progress notes" + rascunhos de metas | Dados de coleta, logs diários, notas por voz | Ed. especial/terapias, EUA |
| Seesaw — Show What You Know (08/2026) | Scores, summaries, indicadores por aluno | Respostas abertas vs. rubrica | Avaliação de tarefa, não relatório descritivo |
| nursery.click (UK) | Observação EYFS completa com áreas e next steps | Foto da atividade | Startup nova |
| SpedZen | Relatórios de progresso "data-backed" | IEP + resultados CBM | Extensão individual; BYO API key |
| Panorama Solara | PLAAFP, impact statements, metas | Dados do SIS | Dados estruturados |

**Só assistente de escrita [V]:** Famly Sidekick, Educa Assist, ClassDojo Sidekick, MagicSchool Report Card Comment Generator, Brisk, Gemini Classroom "Help me write", Copilot.

**Sem IA identificada:** Tapestry, Lillio, Kindertales, Procare, SameGoal, Renaissance.

**Conclusão sobre o white space [I]:** o espaço "documentação pedagógica contínua → evidência ligada a meta individual (PEI) → relatório descritivo gerado e auditável → família" **não está ocupado por um único produto** no mercado internacional. Existem duas metades separadas: (a) early childhood narrativo sem metas individuais (Storypark, Kinderpedia); (b) ed. especial quantitativo com metas mas sem narrativa pedagógica (AbleSpace, Panorama). A metade (a) está sendo ocupada em 2026. O diferencial defensável parece ser a ligação **observação ↔ meta do PEI ↔ relatório**, mais o contexto regulatório/curricular brasileiro (BNCC, LBI, parecer descritivo).

---

## 4. Risco da IA horizontal — com evidências

**Adoção por professores [V via reportagens que citam as fontes]:**
- RAND (RRA4180-1): uso de gen-AI por professores K-12 dos EUA dobrou de 25% (2023-24) para 53% (2024-25). https://www.rand.org/pubs/research_reports/RRA4180-1.html
- Gallup/Walton (2025, n=2.232): 60% usam IA; 32% ao menos semanalmente; usuários semanais economizam **5,9 h/semana (~6 semanas/ano)**. https://news.gallup.com/poll/691967/three-teachers-weekly-saving-six-weeks-year.aspx
- OECD TALIS 2024 (publ. 05/12/2025): ~41% dos professores da OCDE usam IA no ensino; usos: resumir tópicos 68%, gerar planos 64%; **avaliar/corrigir 26% e revisar dados de desempenho 25% (os menos comuns)**. https://www.ei-ie.org/en/item/31815:using-artificial-intelligence-takeaways-from-talis-2024
- Early childhood: Procare (03/2026): 39% usam IA (+77% a/a). RAND (12/2025) sobre hesitação de professores de pré-K: https://www.rand.org/pubs/commentary/2025/12/pre-k-teachers-are-hesitant-to-use-artificial-intelligence-why.html

**Uso específico para IEP [V — CDT via EdWeek 10/2025, Disability Scoop 18/11/2025, NPR 20/05/2026]:**
- CDT (2025; 806 professores, 275 de ed. especial): **57%** dos professores de ed. especial usaram IA para IEP/504 em 2024-25 (39% no ano anterior); **15% usaram IA para escrever o plano inteiro**; 31% para tendências de progresso; 30% para resumir IEPs; **só 22% receberam treinamento sobre riscos**; 64% dos pais acham "boa ideia". https://www.edweek.org/teaching-learning/teachers-are-using-ai-to-help-write-ieps-advocates-have-concerns/2025/10 ; https://cdt.org/wp-content/uploads/2025/10/2025-10-28-CDT-AI-IEP-Brief-1.pdf
- NPR (20/05/2026): professores usam "from free consumer platforms like ChatGPT and Claude to district-approved tools like MagicSchool AI, Google Gemini and Playground IEP"; CDT: modelos de reconhecimento de padrões são "to a certain extent, inherently incompatible with a process that legally requires individualization". https://www.npr.org/2026/05/20/nx-s1-5810192/special-education-teachers-ai-ieps

**Problemas documentados [V]:**
- Privacidade: IEP é education record; colar meta no ChatGPT pode violar FERPA/política interna; ChatGPT "solicitou nome e resultados diagnósticos" ao gerar IEP. https://www.disabilityscoop.com/2025/11/18/concerns-raised-as-teachers-increasingly-use-ai-to-write-ieps/31742/ ; https://fpf.org/wp-content/uploads/2024/10/Ed_AI_legal_compliance.pdf_FInal_OCT24.pdf
- Alucinação: "AI platforms sometimes invent studies or misrepresent findings" (EdWeek).
- Individualização/viés: linguagem "templated"; risco de descumprir IDEA (EdWeek, CDT).
- Políticas: só 2 estados exigem política distrital de IA (EdWeek 10/2025). https://www.aiforeducation.io/ai-resources/state-ai-guidance

**Resposta das big techs [V]:** ChatGPT for Teachers grátis para K-12 dos EUA até 06/2028, sem treinar com dados; Gemini for Education com Common Sense Privacy Seal; Copilot Chat grátis em A1. **[I]** O argumento "não use ChatGPT por privacidade" está enfraquecendo nos EUA; no Brasil (LGPD + dados de saúde/deficiência de menores) continua válido, mas não deve ser a única defesa.

**Avaliação de risco [I]:** alto para "gerar texto a partir de um prompt" (já é commodity grátis). Baixo para: (1) registro contínuo estruturado com vínculo a criança/meta/currículo; (2) trilha de auditoria (qual evidência sustenta qual afirmação); (3) fluxo multi-ator com aprovação; (4) histórico longitudinal por criança.

---

## 5. Dados de carga de trabalho

| Fonte | Dado | Status |
|---|---|---|
| OECD TALIS 2024 (publ. 12/2025) | Trabalho administrativo: média OCDE ~3 h/semana; **52% dos professores** apontam excesso de trabalho administrativo como fonte de estresse | [V] via country notes e EI: https://www.oecd.org/en/publications/results-from-talis-2024-country-notes_e127f9e2-en/australia_75d1e7a1-en.html ; dados do Brasil: `INSUFFICIENT EVIDENCE` |
| Gallup/Walton 2025 | Usuários semanais de IA economizam 5,9 h/semana | [V] |
| EdWeek Research Center | Professor típico trabalha 54 h/semana, 25 h ensinando; mediana de 5 h/semana corrigindo e dando feedback | [V] https://www.edweek.org/teaching-learning/how-teachers-spend-their-time-a-breakdown/2022/04 ; https://www.edweek.org/technology/heres-how-teachers-are-using-ai-to-save-time/2025/02 |
| DfE Inglaterra, Working Lives wave 4 (04/2026) | 50,1 h/semana em 2025; primário 51,4 h; 49% insatisfeitos com carga | [V] https://schoolsweek.co.uk/6-encouraging-findings-from-dfes-workload-survey/ |
| Ed. especial EUA — CRS/SPeNSE | >10% do tempo (~5 h/semana) em papelada; **~2 h por IEP**; 53% dizem que papelada interfere "a great extent" | [V] dados antigos (~2000–2002): https://www.everycrsreport.com/reports/RS21226.html |
| Frontline (cita GAO 2016) | "Até 7 semanas por ano em papelada" | [V] claim de vendor: https://www.frontlineeducation.com/blog/how-special-educators-spend-work-day/ |
| Panorama/Mesquite ISD | IEP de 2–3 h → ~45 min com Solara | [V] claim de vendor |
| Kinderpedia | "6–9 h/sem economizadas" | [V] claim de vendor, sem metodologia |

**Lacuna [I]:** não há número internacional recente e independente para "horas por semana escrevendo relatórios descritivos individuais de EI/Fund. I". Usar TALIS 2024 e Gallup 2025 como âncoras; tratar números de vendors como ilustrativos.

---

## 6. Síntese

1. **[V]** IA em ed. especial nos EUA virou padrão de mercado em 2025–26. Todos geram **rascunho de texto**; só Panorama e AbleSpace partem de **dados do aluno**.
2. **[V]** Em early childhood, 2026 é o ano em que "observação → resumo gerado" chegou ao mainstream (Storypark, Kinderpedia, Seesaw, nursery.click).
3. **[I]** White space real: ninguém conecta **observação contínua ↔ meta individual do PEI ↔ relatório periódico ↔ família** com trilha de evidência.
4. **[V]** 57% dos professores de ed. especial dos EUA já usam IA para IEP; ChatGPT for Teachers é grátis até 2028. **[I]** Competir em "gera texto" é perder.
5. **[V]** Preços de referência: EC US$ 1,29–1,79/criança/mês (Educa, Storypark) ou €199/centro/mês (Kinderpedia Pro); IA como add-on (Storypark Assist); ferramentas de professor US$ 8–15/mês; SpEd US$ 10–12/professor/mês (Playground); comunicação US$ 3/aluno/ano (Bloomz).

Sem evidência suficiente nesta rodada: dados TALIS do Brasil; horas de "pupil reports" no DfE wave 4; IA da SameGoal, Kindertales, Procare, Renaissance, Ori Learning; tração de Brisk, Diffit, Eduaide, SchoolAI, Tapestry (só terceiros).
