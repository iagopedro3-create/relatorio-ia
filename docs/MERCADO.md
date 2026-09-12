# Mercado e diferenciação — 12/09/2026

Pesquisa nos sites oficiais (ActiveSoft, ClassApp, iScholar, Sponte/TOTVS, Agenda Edu). Nenhum
publica preço; todos vendem por consultor e cobram implantação. Resumo do que cada um entrega:

| | ActiveSoft | ClassApp | iScholar | Sponte (TOTVS) | Agenda Edu |
|---|---|---|---|---|---|
| Foco | ERP completo (financeiro forte, régua de cobrança, conciliação, Isaac) | Comunicação escola–família (app, autorizações, enquetes, ClassPay) | ERP + portal; alvo >200 alunos; "Intelligence" com dashboards | ERP líder (5.200 escolas), financeiro + "Mensalidade Garantida", analytics com IA | Comunicação + agenda infantil (diário, fotos), pagamentos, integra 20+ ERPs |
| Pedagógico | Diário, avaliações, "apoio à coordenação" (genérico) | Relatórios de rotina, formulários | Diário, boletim, histórico, biblioteca | Notas, frequência, boletim | Diário de bordo, mural de fotos |
| Relatório descritivo (Infantil) | Não é produto | Não | Não | Não | Diário do dia, não relatório bimestral |
| IA | Não pedagógica | Não | Dashboards | Analytics | Não |
| Financeiro | Sim, completo | Boletos via ClassPay | Boleto/cartão/Pix + régua | Sim + garantia de recebíveis | Cobrança recorrente + shop |
| Marca da escola | Não (marca deles no app) | App próprio ClassApp | Portal com logo | App Sponte | App Agenda Edu |
| Implantação | "poucos dias", consultor | 20 dias | demo com consultor | migração assistida | consultor |
| Porta de entrada | Diretor financeiro | Comunicação/família | Secretaria | Secretaria/financeiro | Família/comunicação |

## Onde ninguém está

1. **O trabalho pedagógico da professora.** Todos tratam "pedagógico" como lançar nota e frequência.
   Nenhum ajuda a professora a *documentar* o desenvolvimento da criança nem a *escrever* — que é
   onde vão 15–20 h por bimestre na Educação Infantil. Nosso relatório com IA + revisão da coordenação
   é único no quadro.
2. **Documentação pedagógica contínua.** O Agenda Edu tem "diário do dia" (comeu, dormiu). Nenhum tem
   **registro de observação por campo de experiência da BNCC ao longo do bimestre**, com foto, que vira
   matéria-prima do relatório e do PEI. Isso é o que a coordenação pede e a professora não consegue manter.
3. **PEI e inclusão.** Ausente em todos. Lei 13.146 exige; escola pequena faz no Word. Já temos com
   consentimento LGPD embutido.
4. **Marca da escola.** ClassApp/Agenda Edu/Sponte colocam a marca *deles* no bolso dos pais. Para a escola
   pequena, "o app da escola" é argumento de matrícula.
5. **Preço transparente e sem implantação.** Todos escondem preço e cobram consultor. Escola de 80 alunos
   não recebe ligação de volta do Sponte. Publicar R$ 399/799, sem fidelidade, com checklist de
   auto-implantação, é posicionamento por si só.

## Onde precisamos ter paridade (senão perdemos na comparação)

- Financeiro com boleto/Pix/cartão e régua de cobrança (E1 — em construção, via Asaas da própria escola).
- Autorizações digitais (passeio, uso de imagem, medicação) com aceite do responsável.
- Ocorrências e saúde (alergias, medicação, incidentes) no prontuário.
- Chamada e diário pelo celular em menos de um minuto.
- Rematrícula/pré-matrícula online (mais tarde).

## Tese de produto

> "O sistema que a **coordenação pedagógica** escolhe — e que o financeiro aprova."

Concorrentes entram pela secretaria e pelo financeiro; a escola pequena de Infantil é dirigida por uma
pedagoga. Entramos pela dor dela (relatório, PEI, documentação), entregamos o que a família cobra
(app com a marca da escola, boleto/Pix) e o que o financeiro exige (cobrança automática, inadimplência).

## O que isso muda no roadmap

Além do financeiro (E1) e da coerência (E2), entram três épicos pedagógicos que ninguém tem:

- **E6 — Documentação pedagógica contínua**: registros rápidos por criança (texto + foto, campo BNCC),
  timeline da criança, e o gerador de relatório puxa os registros do período. Muda a proposta de
  "IA escreve" para "IA escreve **a partir do que você observou o bimestre inteiro**".
- **E7 — Prontuário e cuidado**: ocorrências, saúde (alergias, medicação, contatos de emergência),
  autorizações digitais com aceite do responsável e trilha de auditoria.
- **E8 — Mapa de desenvolvimento**: por turma e por criança, quais campos/habilidades da BNCC têm
  registros e quais estão sem evidência; alerta para a coordenação antes do fechamento do bimestre.
