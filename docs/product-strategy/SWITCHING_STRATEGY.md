# SWITCHING STRATEGY — Althion Education

Data: 14/09/2026. Cobre Fase 13 (barreiras de troca por alternativa, como reduzir 80%), a hipótese rip-and-replace vs land-and-expand, e Fase 12 (privacidade como requisito de troca). Evidência de mercado nos apêndices `research/03` e `research/04`.

---

## 1. Como as escolas do ICP trabalham hoje (por alternativa)

| Alternativa atual | Onde é usada | Barreira de troca | O que reduz a barreira |
|---|---|---|---|
| **Word / Google Docs** (PEI, relatórios, estudo de caso) | quase todas as escolas pequenas | dados históricos em dezenas de arquivos; modelos próprios da escola; hábito da coordenação; "o documento é meu" | **importar Word/PDF → estrutura**; exportar sempre em Word/PDF; manter o "modelo da escola" como template; zero custo de sair |
| **Excel / Google Sheets** (controle de quem entregou, lista de alunos, crianças com laudo) | coordenação | planilha de controle é a "verdade" da coordenação | importar planilha de alunos (já existe); painel de pendências que substitua a planilha no primeiro bimestre |
| **PDFs e fotos soltas no celular** | professoras | evidência dispersa, sem data confiável | captura em 4 toques com data/autora automáticas; foto ligada à criança |
| **ChatGPT / Gemini** (escondido ou tolerado) | professoras e coordenação | zero custo; instantâneo; "funciona" | não competir na redação; competir em origem, revisão, auditoria e LGPD (diagnóstico de criança no ChatGPT é problema para a escola) |
| **ERP / SIS** (Sponte, Activesoft, iScholar, Proesc, Sophia) | escolas com >100 alunos | contrato, financeiro, matrícula, histórico, secretaria treinada; migração assistida pelo incumbente | **não substituir**: coexistir; importar cadastro por planilha/API; o ERP continua sendo o sistema de registro administrativo |
| **App de comunicação** (ClassApp/Meu Arco, Agenda Edu, Layers) | escolas com >80 alunos | famílias já têm o app instalado; pagamentos acoplados | não competir no app da família no início; entregar o relatório/PEI aprovado em PDF que a escola manda pelo app que já usa; portal próprio como opção |
| **Plataforma especializada de inclusão** (Vínculo, AEE Pro, IncludED) | minoria; crescendo | dados de metas e evidência já estruturados; hábito do AEE | importação de exportações deles (quando existirem); diferencial "para todas as crianças, não só inclusão"; sem fidelidade |
| **Sistema de ensino com PEI** (Somos/Plurall) | 8,3 mil escolas Somos | grátis, já logado | **não é ICP**; não tentar |
| **Processos manuais / caderno** | creches e escolas muito pequenas | nenhum dado digital; resistência a "sistema" | onboarding por WhatsApp/voz; a coordenação cadastra tudo; primeira semana concierge |
| **Sistema próprio / consultoria** | raro | — | — |

## 2. Barreiras por tipo (com peso no ICP)

| Barreira | Peso | Resposta |
|---|---|---|
| Dados históricos (PEIs e relatórios antigos) | **alto** | migração inteligente Word/PDF → estrutura, com revisão |
| Treinamento de professoras | **alto** (rotatividade, tempo) | fluxo de 4 toques; convite por WhatsApp/e-mail; vídeo de 90 s; nenhuma tela obrigatória além de "registrar" |
| Configuração (turmas, períodos, pesos, marca) | médio | tirar do caminho crítico; defaults por segmento; períodos aproximados automáticos (já existe) |
| Resistência da coordenação ("mais um sistema") | **alto** | valor em 15 min com o documento que ela já tem; painel que substitui a planilha |
| Integrações com ERP/app da família | médio | coexistência; CSV; SSO Google; API só depois |
| Contratos/fidelidade | baixo (não há contrato para Word) | sem fidelidade, mensal, cancelamento self-serve, exportação total a qualquer momento |
| Custo | médio | preço público; faixa abaixo do "sob consulta" dos ERPs |
| Risco (LGPD, dados de crianças com deficiência) | **alto e crescente** | consentimento, região BR, sem diagnóstico no prompt, trilha de auditoria, DPA público — vira argumento *a favor* da troca |
| Processos existentes (modelo de PEI da escola, calendário) | médio | templates por escola; ciclo alinhado ao bimestre |

## 3. Como reduzir o custo de troca em 80%

1. **Importação automática de documentos** (o maior item): PEI e relatório em Word/PDF → perfil, metas, estratégias, texto por campo BNCC. Revisão obrigatória em tela. Meta: 5 minutos por criança acompanhada.
2. **Importação de alunos**: planilha da escola (já existe) + aceitar a exportação padrão do Sponte/Activesoft/iScholar (mapeamento de colunas flexível) + API do iScholar quando houver demanda.
3. **Templates**: modelo de PEI de referência (estudo de caso → metas → estratégias → monitoramento → relatório periódico) e o modelo que a escola já usa como layout de saída.
4. **Onboarding assistido (concierge) para as primeiras 20 escolas**: a plataforma faz o setup em uma chamada de 30 min; o custo é investimento em aprendizado.
5. **Setup feito pela plataforma**: criar escola, importar, convidar — pela coordenação, em self-serve, sem operador.
6. **Coexistência**: o ERP fica; o app da família fica; o produto entrega PDF aprovado e, opcionalmente, o portal próprio.
7. **SSO Google**: escolas usam Workspace; login com Google elimina "senha repassada à mão".
8. **Treinamento contextual**: cada tela com o "por que" em uma linha; vídeo curto; sem manual.
9. **Saída garantida**: exportação completa (documentos, observações, metas, fotos) em ZIP/PDF/CSV a qualquer momento. Diz para a escola: "você não fica presa".
10. **Sem fidelidade**, preço público, cancelamento self-serve.

## 4. Rip-and-replace versus land-and-expand

| | Rip-and-replace (tese atual do MERCADO: "sistema completo + financeiro") | Land-and-expand (camada pedagógica com evidência) |
|---|---|---|
| Fricção de GTM | **alta**: migração de ERP, financeiro, famílias trocando de app, secretaria retreinada; Sponte migra de graça | **baixa**: 3–15 crianças, 1 coordenadora, planilha de alunos |
| Tempo até valor | semanas | 15 minutos |
| Quem decide | mantenedor + secretaria + financeiro | coordenação (champion) com "ok" do mantenedor |
| Concorrência direta | Sponte, Activesoft, Arco, Agenda Edu | Vínculo, Word |
| Expansão | difícil sair do "sistema" | natural: PEI → relatórios de todas as crianças → família → outras unidades → (um dia) financeiro |
| Risco | construir 24 páginas para ninguém (o que aconteceu) | ser "só um módulo" e ter ticket baixo |
| Recomendação | **não agora** | **sim** |

```
ERP/SIS continua (matrícula, financeiro, boletim)
+ app da família continua (comunicados)
+ Althion Education entra como camada de documentação pedagógica com evidência
  (PEI vivo → relatórios → família)
↓ acumula histórico por criança (metas, evidência, versões)
↓ vira o lugar onde a coordenação trabalha todo dia
↓ amplia: mapa BNCC, AEE externo, portal, notificações
↓ torna-se essencial; então (e só então) financeiro/ERP para quem pedir
```

## 5. Privacidade, segurança e IA responsável como requisito de troca (Fase 12)

Uma escola que hoje coloca diagnóstico de criança no ChatGPT está trocando *para* algo mais seguro. Isso só vale se for verdade. Gaps atuais e o que fazer (detalhe no apêndice 01 §6):

| Tema | Hoje | Necessário para vender e para o CNE/ANPD |
|---|---|---|
| Minimização | primeiro nome só; mas diagnóstico em texto livre no prompt; nome do professor inteiro | **retirar diagnóstico do prompt**: enviar só indicadores funcionais; professor por iniciais; textos livres com aviso "não cole laudos" |
| Multi-tenancy / RBAC | base boa; **3 furos graves** (role, plano, aprovação) + fotos listáveis + e-mails expostos | corrigir antes da primeira escola; testes de RLS automatizados |
| Logs / audit trail | inexistente | `audit_log` (quem, o quê, quando, por quê) em documentos, metas, consentimento, acesso a dados sensíveis |
| Versionamento | inexistente | `document_versions`; aprovado é imutável; nova versão gera nova revisão |
| Criptografia | TLS; sem criptografia de campo | avaliar criptografia de campo para diagnóstico/saúde; segredos do Asaas cifrados |
| Retenção / exclusão | nenhuma rotina; cascade apaga faturas | política por tipo (documentos: prazo escolar; logs de IA: 12 meses); exclusão seletiva; anonimização ao sair |
| Consentimento | checkbox com timestamp | termo anexado (PDF), data real, revogação que bloqueia novos usos e registra; consentimento por finalidade (PEI, foto, compartilhar com família) |
| Sub-processadores | DPA lista 3; reais são 6+ (Asaas, Stripe, Google Fonts) | DPA atualizado e público; fontes self-hosted |
| Provedor de IA / região | OpenAI/Gemini; banco aparentemente us-west | documentar transferência internacional ou mover para sa-east-1; contrato de não-treinamento; opção de provedor nacional/isolado depois |
| Exposição em prompts | textos livres podem conter qualquer coisa | filtro de PII básico (CPF, nomes completos) antes de enviar; aviso na tela |
| Pseudonimização | parcial | manter; adicionar IDs opacos em vez de nome quando possível |
| Exportação / portabilidade | prometida, não existe | exportação completa por escola e por criança |
| Avaliação de impacto (CNE risco alto) | não existe | documento de avaliação de impacto do uso de IA no PEI; registro institucional; revisão humana obrigatória e comprovável (já parcialmente: fluxo de aprovação) |

### Guardrail pedagógico (a ser escrito nos prompts e na UI)

A plataforma **não**: diagnostica; infere transtorno ou condição psicológica; emite avaliação clínica; decide tratamento; atribui condição a partir de comportamento; fabrica observações, progresso ou evidências. O texto de IA é sempre rascunho; a decisão é do profissional, registrada com nome e data.

Diferença a manter visível na interface: **texto gerado por IA** (marcado, com origem) versus **julgamento profissional apoiado por IA** (o que a coordenação aprova, edita e assina).
