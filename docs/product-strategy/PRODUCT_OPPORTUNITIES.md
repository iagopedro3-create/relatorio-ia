# PRODUCT OPPORTUNITIES — Althion Education

Data: 14/09/2026. Base: `PRODUCT_AUDIT.md`, `COMPETITIVE_LANDSCAPE.md` e apêndices em `research/`. Este documento cobre: personas e JTBD (Fase 4), Time-to-Value (Fase 3), crítica das features de IA (Fase 7), wedge (Fase 8), 10x moments (Fase 9), tese Evidence → Plan → Action → Outcome (Fase 10), capacidades inovadoras (Fase 11), moat (Fase 14) e priorização (Fase 19).

Marcações: **[EXISTENTE]** · **[PARCIAL]** · **[DOC]** documentado mas não implementado · **[HIPÓTESE]** · **[RECOMENDAÇÃO]** · **[MERCADO]** informação verificada nos apêndices.

---

## 1. Personas e Jobs to Be Done

`buyer ≠ admin ≠ champion ≠ daily user`. Em escola pequena (o ICP), mantenedor e diretor costumam ser a mesma pessoa ou casal; coordenação é a champion; a professora regente é a daily user; a família é quem pressiona.

| Persona | Job funcional | Dores | Risco pessoal | Frequência | Alternativa hoje | Cria / revisa / aprova / usa depois | Paga / influencia / bloqueia |
|---|---|---|---|---|---|---|---|
| **Mantenedor/direção** | manter matrículas, evitar problema jurídico, não perder professora | inadimplência; famílias de crianças incluídas exigindo; MP/Procon (LBI: crime recusar/cobrar a mais); rotatividade docente | responsabilidade legal, reputação | mensal; picos em matrícula (nov–fev) | ERP + Word + advogado quando dá errado | usa depois (documento pronto para mostrar) | **paga**; bloqueia se parecer "mais um sistema" |
| **Coordenação pedagógica** | garantir que cada criança tenha relatório e PEI de qualidade, no prazo, coerentes | escreve/reescreve o que a professora não consegue; PEI de fevereiro que ninguém abre; cobrar registros; reuniões com família sem evidência | ser responsabilizada por documento fraco ou ausente | diária (acompanha), bimestral (fecha) | Google Docs + planilha de controle + WhatsApp + ChatGPT escondido | **revisa e aprova**; cria o PEI junto com AEE | **champion**; influencia a compra decisivamente |
| **Professora regente (EI / Fund I)** | dar aula e, no fim do bimestre, escrever 15–25 relatórios; "seguir o PEI" de 1–3 crianças | não sabe o que observar para a meta; escreve em casa à noite; ChatGPT gera texto genérico e a coordenação devolve | culpa, sobrecarga (TALIS BR: 40,3 h/sem; 21% "muito estressados" [MERCADO]) | diária (observa), bimestral (escreve) | caderno/celular (fotos soltas), Word, ChatGPT | **cria** observações e rascunhos | não paga; **bloqueia por não usar** |
| **Profissional do AEE / professor de apoio** | estudo de caso, PAEE/PEI, atendimento, articular com a regente | trabalha em várias escolas; a regente não vê o PEI; formação de 360 h exigida agora [MERCADO] | perder contrato se documentação falhar | semanal | Word, AEE Pro, Vínculo, modelos de Facebook | **cria** o PEI; revisa com coordenação | influencia; pode indicar a ferramenta a outras escolas (é itinerante) |
| **Equipe multidisciplinar externa** (fono, TO, psicólogo) | alinhar estratégias com a escola | recebe PDF sem contexto | — | mensal | e-mail, WhatsApp | usa depois; contribui em estudo de caso | influencia a família |
| **Secretaria** | matrícula, documentos oficiais, Censo | PEI é documento aceito no Censo para declarar aluno com deficiência [MERCADO] | — | anual | ERP | usa depois | bloqueia se duplicar cadastro |
| **Família** | saber como o filho está; ter o PEI em mãos; cobrar a escola | "só recebo o relatório no fim do semestre"; não entende o PEI; desconfia | — | semanal | WhatsApp, reunião | **recebe**; assina consentimento | influencia matrícula/rematrícula; pode judicializar |
| **TI/sistemas** | (raro no ICP) senhas, LGPD | — | — | — | — | — | bloqueia por segurança/LGPD em escola média/rede |

**Insight de produto**: o job que une coordenação, regente e AEE é *"transformar o que acontece na sala em documento defensável sem trabalhar à noite"*. O job que une mantenedor e família é *"ter prova de que a escola está cuidando desta criança"*.

---

## 2. Crítica das features de IA (Fase 7)

Pergunta-teste: *"Se ChatGPT/Gemini fazem isso com um prompt razoável, por que a escola pagaria?"*

| Feature | Estado | Defensibilidade como está | O que a tornaria defensável |
|---|---|---|---|
| Relatório descritivo | [EXISTENTE] | **baixa** — é um formulário → texto; Gemini no Docs faz igual | citar registros de observação por parágrafo; histórico de bimestres anteriores no contexto; ciclo com devolução; versão; família notificada |
| PEI | [EXISTENTE] raso | **baixa** — AEE Pro, Vínculo, Somos, ChatGPT geram texto igual ou melhor; **risco**: diagnóstico em texto livre ao provedor e prompt que pede "perfil baseado no diagnóstico" | metas como objetos; evidência ligada; linha de base; progresso; relatório periódico; guardrail explícito (não diagnosticar, não inferir condição, não fabricar progresso); trilha de auditoria CNE |
| Inteligência pedagógica (prova) | [EXISTENTE] | **baixa** — planilha + ChatGPT | só vale se gerar ação por aluno ligada à timeline; hoje é painel de texto |
| Copiloto de planejamento | [EXISTENTE] | **nula** — Teachy, MagicSchool, Gemini, ChatGPT; prompt livre do cliente | não tentar; manter como conveniência ou remover |
| Transcrição de voz → observação | não existe | média — Memoz, Famly já têm | vale como redutor de atrito do fluxo de evidência, não como feature vendável |
| Estruturar PEI antigo (Word/PDF → metas) | não existe | **alta** — ninguém faz no Brasil; reduz barreira de troca | é a porta de entrada |

**Regra [RECOMENDAÇÃO]**: nenhuma feature de IA recebe investimento se o valor for "escreve texto". Investimento só em IA que *lê o que a escola registrou*, *cita de onde tirou*, e *entrega para revisão humana rastreável*.

---

## 3. Time-to-First-Value (Fase 3)

**Hoje**: 2–4 h de setup (senhas à mão, cadastro manual, turma↔usuário) e o diferencial só aparece semanas depois (quando houver observações). O primeiro documento gerado é indistinguível de ChatGPT.

**Alvo [RECOMENDAÇÃO]**: *15 minutos até algo que a coordenação não consegue fazer no Word*.

Sequência proposta do primeiro uso:
1. Coordenação cria a conta sozinha (self-serve com Google — as escolas já usam Workspace).
2. Sobe a planilha de alunos que já tem (ou só digita os 3–10 nomes das crianças acompanhadas).
3. **Arrasta o PEI atual em Word/PDF** → o sistema extrai perfil, metas e estratégias e mostra para confirmar (ou, sem documento, responde 8 perguntas do estudo de caso).
4. Vê as metas estruturadas, cada uma com "o que observar" sugerido para a professora.
5. Convida a professora por e-mail/WhatsApp; ela abre no celular e vê "Pedro — 3 metas — registre o que viu hoje".
6. Primeira observação em 20 s → aparece ligada à meta no painel da coordenação.

Momento "isso me economiza trabalho": passo 3–4 (o Word virou plano) e passo 6 (a evidência chegou sozinha). Ambos em menos de 20 minutos, sem turmas completas, sem notas, sem financeiro.

O que sai do caminho crítico: criar turmas completas, anos letivos, pesos, marca, agenda, financeiro. Tudo isso passa a ser "depois".

---

## 4. Wedge (Fase 8)

| Wedge | Dor | Freq. | Urgência | Venda | Implantação | Nº usuários | Concorrência | Diferenciação possível | Expansão | Retenção | Ticket | Switching cost criado | Dados proprietários |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **PEI vivo com evidência da sala comum** | alta (legal + pedagógica) | contínua + revisões | **alta** (Decreto 12.773, TEA +44%/ano, MP) | fácil de explicar; champion clara | pequena (3–15 crianças por escola) | poucos no início | Vínculo forte; Somos cativo; geradores commodity | alta (fora do silo do AEE; ligado à regente e ao relatório) | natural → relatório de todas as crianças | alta (metas e evidência acumulam) | médio | alto (histórico longitudinal por criança) | sim |
| Relatório descritivo a partir de observações (todas as crianças) | alta (volume) | 2–4×/ano | média | fácil | média (todas as professoras) | todos | Memoz, Kinderpedia, ChatGPT+Docs | média (citação de evidência, ciclo) | → PEI, família | média (sazonal) | alto (por criança) | médio | sim |
| Documentação pedagógica / observações | média | diária | baixa | difícil ("mais um app") | média | todos | Memoz, Diário Escola | baixa sozinha | — | depende de hábito | baixo | médio | sim |
| Gestão do AEE (agenda, atendimentos, estudo de caso) | média | semanal | média | AEE compra sozinha | fácil | 1–2 | AEE Pro, Vínculo, PAMI | baixa | limitada (silo) | média | baixo | baixo | sim |
| Comunicação com famílias / app da escola | média | diária | baixa | difícil (Arco, Bemobi, Layers) | média | todos | fortíssima | nula | — | alta se vingar | médio | alto | não |
| Sistema completo com financeiro (tese atual) | alta (financeiro) | mensal | média | **difícil** (Sponte migra de graça) | **alta** | todos | fortíssima | nula | — | alta (lock-in) | alto | alto | não |
| Coordenação pedagógica (painéis, pendências) | média | semanal | baixa | vaga | fácil | 1–2 | ninguém e todos | baixa sozinha | — | baixa | baixo | baixo | derivado |
| Planejamento adaptado / copiloto | baixa | semanal | baixa | — | fácil | todos | Teachy, Gemini grátis | nula | — | baixa | nulo | nulo | não |

### WEDGE RECOMENDADO: **"PEI vivo, baseado em evidência da sala comum"**, com o relatório descritivo de todas as crianças como expansão imediata (mesmo motor de evidência).

Por quê:
- **Gatilho externo real e datado**: desde 09/12/2025 o PEI é obrigatório, deve derivar de estudo de caso, ter *atualização contínua* e *orientar a sala de aula comum* (art. 12 do Decreto 12.773 [MERCADO]). Nenhum produto entrega "atualização contínua" e "orientar a sala comum" — entregam um texto.
- **Poucas crianças por escola** → onboarding pequeno, valor rápido, professora regente com 1–3 crianças consegue registrar.
- **Champion e buyer alinhados**: a coordenação sofre; o mantenedor tem exposição legal; a família cobra.
- **Cria dado proprietário desde o dia 1** (metas + evidência + versões) e o custo de troca cresce a cada bimestre.
- **Sai do silo do AEE**: Vínculo vende para a inclusão; nós vendemos para a coordenação da escola inteira, e o mesmo fluxo de observação vira relatório de todas as crianças no fim do bimestre. É a ponte que ninguém construiu.
- Não exige paridade com ERP: coexiste.

O que o wedge **não** é: "IA para gerar PEI" (commodity), "sistema escolar completo" (guerra contra Sponte/Arco), "gestão do AEE" (silo, Vínculo).

---

## 5. Dez possíveis "10x moments" (Fase 9)

1. **"O PEI que sabe o que aconteceu desde fevereiro."** Coordenação abre o PEI no fechamento do bimestre e vê cada meta com as observações ligadas (data, autora, foto), status de progresso e um relatório de progresso para a família em um clique. Antes: Word de fevereiro que ninguém abriu.
2. **"Do Word para o plano em 5 minutos."** Arrasta PEIs e relatórios antigos (Word/PDF) e sai perfil, metas, estratégias estruturadas para confirmar. Antes: retrabalho ou nunca migrar.
3. **"25 relatórios em uma tarde, cada parágrafo com origem."** Relatório descritivo gerado do bimestre inteiro de observações, com marcador "vem destes 4 registros" que a coordenação pode abrir. Antes: 15–20 h em casa e texto genérico.
4. **"A professora sabe o que observar."** Segunda-feira, no celular: "Pedro — meta 2 — observe em momentos de transição". Antes: PEI genérico, professora sem direção.
5. **"Devolvi com comentário e ela viu no celular."** Ciclo enviar → devolver → aprovar → família notificada, com versão. Antes: WhatsApp e reescrever.
6. **"A reunião com a família começa com evidência."** Linha do tempo da criança com registros compartilháveis e progresso de meta. Antes: memória e opinião.
7. **"Sem evidência, sem parágrafo."** Guardrail que impede a IA de afirmar o que não foi registrado e marca lacunas ("nenhum registro em 'Corpo, gestos e movimentos' neste período"). Antes: alucinação elegante.
8. **"Quem viu o quê, quando, com base em quê."** Trilha de auditoria pronta para MP, família, CNE/ANPD. Antes: nada.
9. **"Falei 20 segundos e virou registro."** Voz → observação estruturada e ligada à criança/meta. Antes: foto solta no celular.
10. **"Mapa do bimestre."** Antes do fechamento, quais crianças e quais campos BNCC estão sem evidência. Antes: descobrir na hora de escrever.

### Os três mais fortes
- **#1 PEI que sabe o que aconteceu** — é o wedge inteiro em uma tela; ninguém tem; alinhado ao decreto.
- **#3 Relatório com origem** — o volume da EI, com a defesa contra ChatGPT embutida (citação).
- **#2 Do Word para o plano** — derruba a barreira de troca e dá valor em 5 minutos.

---

## 6. Tese Evidence → Plan → Action → Outcome (Fase 10)

```
Observação (regente, AEE, família?) → Evidência (registro datado, autor, campo BNCC, foto)
→ Contexto da criança (perfil, estudo de caso, histórico) → Objetivo (meta mensurável, linha de base)
→ Plano (estratégias em sala) → Ação da professora (o que observar/fazer esta semana)
→ Registro → Evolução (status da meta, progresso) → Revisão (bimestral, com família) → novo ciclo
```

**Avaliação crítica**:
- **Mercado**: é exatamente o ciclo do IDEA (PLAAFP → meta → medição → relatório periódico) e do MTSS (Branching Minds) [MERCADO]. No Brasil, nenhum produto verificado fecha o ciclo; Vínculo faz parte (características → metas com fonte). Internacionalmente, EI narrativa (Storypark) e ed. especial quantitativa (AbleSpace) são metades separadas.
- **Usuário**: a regente registra se custar ≤20 s e se receber de volta algo útil (o relatório pronto, a reunião preparada). A coordenação adota se reduzir cobrança e retrabalho. A família aceita se for notificada e se entender.
- **Riscos de aceitar cegamente**: (a) burocratizar a professora (mais campos = menos uso); (b) "outcome" virar avaliação clínica — **não**: progresso é sobre a meta pedagógica, marcado por humano, nunca inferido pela IA; (c) metas demais — limitar a 3–5 ativas por criança; (d) exigir disciplina antes do valor — por isso a importação de documentos antigos e o relatório com origem precisam vir antes.
- **Veredito**: é o diferencial estratégico, **desde que** o registro seja trivial, a IA nunca marque progresso sozinha, e o valor apareça já no primeiro bimestre. Sem essas três condições, vira ERP pedagógico que ninguém preenche.

---

## 7. Capacidades inovadoras — avaliação (Fase 11)

| Capacidade | Veredito | Por quê / condições | Prioridade |
|---|---|---|---|
| **Student Intelligence Timeline** | BUILD | É a espinha do produto: observações, documentos, metas, versões, ocorrências numa linha do tempo por criança. Hoje existe em pedaços (StudentProfile + observações). Não precisa de IA. | NOW |
| **Evidence-Based Reports** | BUILD | Prompt recebe observações com IDs; saída em blocos com `evidence: [ids]`; UI mostra origem; parágrafo sem evidência é sinalizado. Defesa contra ChatGPT e contra CNE. | NOW |
| **Living PEI** | BUILD (é o wedge) | Tabela de metas; status; linha de base; revisão; versões; relatório periódico. | NOW |
| **Goal Tracking** | BUILD | Meta ↔ observação (N:N), progresso marcado por humano com data; gráfico simples. Nunca inferido. | NOW |
| **Classroom Copilot** (meta → sugestão para a semana) | EXPERIMENT | Valor alto para a regente, mas é geração de texto; só vale ligado à meta e revisado pela coordenação. Testar com 5 escolas antes. | NEXT |
| **Voice-to-Documentation** | NEXT | Reduz atrito; Memoz/Famly já têm; usar STT do provedor + estruturação. Não é diferencial, é higiene. | NEXT |
| **Smart Evidence Capture** (sugerir meta para um registro) | NEXT | Classificação simples (registro → qual meta/campo). Regra: sugere, humano confirma. | NEXT |
| **Collaborative Student Workspace** | PARCIAL hoje | Regente + coordenação + AEE já veem o mesmo aluno; falta comentário, devolução, papel "AEE externo" com acesso restrito. | NOW (devolver/comentar), NEXT (AEE externo) |
| **Family Collaboration** | CUIDADO | Valor: receber progresso de meta, consentir, contribuir observação de casa. Risco: família editar/discutir em thread, judicialização por texto mal escrito, sobrecarga da professora. Fazer: leitura + aceite + notificação. Não fazer: chat, comentários abertos. | NOW (notificar/progresso), LATER (contribuir) |
| **Documentation Quality Guardrails** | BUILD | Checagens determinísticas: meta sem critério mensurável, período sem registro, PEI sem revisão há 90 dias, campos vazios, linguagem rotuladora (lista de termos). Barato e diferenciador. | NOW (básico), NEXT (completo) |
| **Versioning & Audit** | BUILD | Tabela `document_versions` + `audit_log` (quem/o quê/quando/por quê). Requisito regulatório (CNE risco alto) e de venda. | NOW |
| **Intelligent Migration** (Word/PDF → estrutura) | BUILD | Maior redutor de switching cost. Extração por LLM com revisão obrigatória; começa por PEI, depois relatórios. | NOW (PEI), NEXT (relatórios) |
| **School System Integrations** | LATER | iScholar tem API pública; Layers/Agenda Edu têm hubs; Google Workspace para login. Começar por CSV genérico + SSO Google; API só com demanda. | NEXT (SSO, CSV), LATER (APIs) |

---

## 8. Moats (Fase 14)

| Moat | Como nasce | Tempo | Quem copia | Dados | Risco privacidade | Cresce com uso? |
|---|---|---|---|---|---|---|
| **Histórico longitudinal por criança** (metas, evidência, versões, decisões) | uso bimestral; migração de docs antigos | 2–4 bimestres | qualquer um pode construir a estrutura; não copia o histórico | dados da escola, ficam na escola | alto — exige exportação, retenção, região BR | **sim** (é o principal) |
| **Workflow no ritmo da escola** (semana → bimestre → ano) | desenho do produto | imediato | Vínculo, ERPs | nenhum | baixo | sim (hábito) |
| **Trilha de auditoria conforme CNE/ANPD/LGPD** | desde o dia 1 | imediato | copiável, mas ninguém publica | logs | médio | sim |
| **Biblioteca de metas e estratégias refinada por uso** (agregado, sem PII) | após 50+ escolas | 12+ meses | Vínculo já tem algo | metas/estratégias anonimizadas, resultado marcado por humano | **alto** — precisa de agregação sem reidentificação e base legal | sim (flywheel) |
| **Integrações** (SIS, Workspace) | por demanda | 6–12 meses | ERPs têm vantagem | cadastro | baixo | sim |
| **Marca/confiança** ("dados no Brasil, sem laudo para a IA, revisão humana documentada") | posicionamento + prática | 6 meses | copiável em discurso, não em prática | — | — | sim |
| Network effects | AEE itinerante e famílias de TEA em rede | 12+ meses | — | — | — | fraco, mas real no nicho |
| Benchmarks agregados | só com escala | 24+ meses | — | agregados | alto | sim |

O que **não** é moat: a IA, os prompts, o número de features, a marca da escola no app.

---

## 9. Priorização (Fase 19)

Scores 1–5 (5 = melhor; em "Complexidade" e "Risco" 5 = menor).

| Recomendação | User | Buyer | Freq | Dif | Switch | Ret | GTM | Def | Compl | Priv | TTV | Classe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Corrigir RLS (role, plano, aprovação, fotos) + audit log | 2 | 5 | 5 | 1 | 1 | 3 | 4 | 2 | 4 | **5** | 5 | **BUILD NOW** (pré-requisito) |
| Metas do PEI como objeto + status + linha de base | 5 | 5 | 4 | 5 | 5 | 5 | 5 | 5 | 3 | 3 | 4 | **BUILD NOW** |
| Observação ↔ meta + "o que observar esta semana" | 5 | 4 | 5 | 5 | 4 | 5 | 4 | 5 | 3 | 3 | 4 | **BUILD NOW** |
| Relatório/PEI com citação de evidência + lacunas | 5 | 5 | 3 | 5 | 3 | 4 | 5 | 5 | 3 | 4 | 4 | **BUILD NOW** |
| Importar PEI/relatório antigo (Word/PDF → estrutura) | 4 | 5 | 1 | 5 | **5** | 3 | 5 | 4 | 3 | 3 | **5** | **BUILD NOW** |
| Ciclo completo: devolver + comentário + versões + notificação | 4 | 4 | 4 | 3 | 3 | 5 | 3 | 3 | 4 | 4 | 4 | **BUILD NOW** |
| Convite por e-mail + login Google + self-serve | 4 | 3 | 1 | 1 | 4 | 3 | 5 | 1 | 4 | 5 | **5** | **BUILD NOW** |
| Guardrails de prompt (sem diagnóstico, sem inferência) + diagnóstico fora do prompt | 3 | 5 | 5 | 3 | 2 | 3 | 4 | 4 | 5 | **5** | 5 | **BUILD NOW** |
| Relatório de progresso de meta para a família | 4 | 5 | 3 | 5 | 3 | 5 | 4 | 4 | 4 | 3 | 3 | **BUILD NEXT** |
| Relatório descritivo de todas as crianças a partir de evidência (com E8 mapa BNCC) | 5 | 4 | 3 | 4 | 3 | 4 | 4 | 4 | 3 | 4 | 3 | **BUILD NEXT** |
| Quality guardrails determinísticos (meta vaga, sem registro há X dias) | 3 | 4 | 4 | 4 | 2 | 4 | 3 | 4 | 5 | 5 | 4 | **BUILD NEXT** |
| Voz → observação | 4 | 2 | 5 | 2 | 2 | 4 | 2 | 2 | 4 | 3 | 4 | **BUILD NEXT** |
| Papel "AEE externo" com acesso restrito | 3 | 3 | 3 | 3 | 3 | 3 | 4 (canal) | 3 | 4 | 3 | 3 | **EXPERIMENT** |
| Classroom Copilot (meta → sugestão semanal) | 4 | 2 | 4 | 2 | 1 | 3 | 2 | 2 | 4 | 4 | 4 | **EXPERIMENT** |
| Exportação LGPD + retenção + região BR | 2 | 4 | 1 | 2 | 3 | 3 | 3 | 3 | 3 | **5** | 2 | **BUILD NEXT** |
| Integração iScholar/Layers/Agenda Edu | 3 | 4 | 1 | 3 | 5 | 4 | 4 | 4 | 2 | 3 | 3 | **LATER** |
| Biblioteca agregada de metas/estratégias | 3 | 3 | 2 | 4 | 2 | 3 | 2 | 5 | 2 | 1 | 1 | **LATER** |
| Financeiro/Asaas em produção | 4 | 4 | 4 | 1 | 2 | 4 | 1 | 1 | 4 | 2 | 1 | **LATER** (já construído; não deployar agora) |
| E7 saúde/ocorrências/autorizações | 3 | 3 | 3 | 1 | 1 | 2 | 1 | 1 | 4 | 2 | 2 | **LATER** (parquear; corrigir build) |
| Stripe self-serve | 1 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 4 | 4 | 1 | **DON'T BUILD** agora (cobrar por PIX/boleto manual até 20 escolas) |
| Copiloto de planejamento | 2 | 1 | 3 | 1 | 1 | 1 | 1 | 1 | 5 | 4 | 5 | **DON'T BUILD** mais (manter ou remover) |
| Inteligência pedagógica expandida | 3 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | 3 | 3 | 3 | **DON'T BUILD** mais |
| Histórico escolar, diário impresso, ranking top-5 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | — | — | — | **DON'T BUILD**; remover ranking |
| App nativo, offline | 3 | 1 | 4 | 1 | 1 | 3 | 1 | 1 | 1 | 3 | 1 | **DON'T BUILD** |

Feature atraente mas irrelevante para o GTM: **financeiro/Asaas**. Está bem feito, mas coloca o produto na prateleira errada (contra Sponte, isaac, Agenda Edu) e não ajuda a fechar a primeira escola pelo pedagógico. Fica guardado para o momento "a escola pediu para trocar o ERP".
