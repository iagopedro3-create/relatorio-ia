# Roadmap de produto — set/2026

Direção (ver `MERCADO.md`): ser **o sistema que a coordenação pedagógica escolhe e o financeiro aprova**,
para escolas de Infantil e Fund. I, com a marca da escola. Concorrentes (ActiveSoft, Sponte, iScholar,
ClassApp, Agenda Edu) entram pela secretaria/financeiro e tratam "pedagógico" como nota e frequência;
nós entramos pelo trabalho da professora e da coordenação.

Cada épico fecha com migração aplicada, tela testada nos perfis envolvidos e commit.

## E1 — Financeiro da escola + Asaas  ← em execução
- `tuition_plans`, `student_billing`, `invoices`, `finance_webhook_events`, `school_secrets` (chave só no servidor).
- Asaas na **conta da escola**; webhook `/api/finance/webhook?school=<id>` com token.
- Direção: mês (a receber, recebido, atraso, inadimplência), gerar cobranças em lote, emitir/cancelar/sincronizar,
  marcar pago, link/PIX por aluno, pagador por aluno, planos de mensalidade, configuração.
- Família: Financeiro com boletos/PIX dos filhos.
- Feature `finance` (Completo e Rede).

## E6 — Documentação pedagógica contínua (diferencial nº 1)
- `observations`: registro rápido por criança (texto, foto opcional, campo de experiência BNCC, data),
  feito pelo celular em 20 segundos. Timeline da criança.
- Gerador de relatório e PEI **pré-carregam as observações do período** — a IA escreve a partir do bimestre inteiro.
- Família vê os registros marcados como "compartilhar" (o "mural" que o Agenda Edu vende, mas ligado ao desenvolvimento).

## E7 — Prontuário e cuidado (paridade + confiança)
- Saúde: alergias, medicação, restrições, contatos de emergência (LGPD: dado sensível, só direção/coordenação/professora da turma).
- Ocorrências: incidente, elogio, atendimento à família — com quem registrou e quando.
- Autorizações digitais: passeio, imagem, medicação — a família aceita no portal, com hora e IP.

## E2 — Coerência dos fluxos (auditoria de 11/09)
- PEI com enviar → aprovar/devolver. Análise da Inteligência persistida. Datas dos períodos por ano letivo.
- Home da coordenação: planos e PEIs pendentes; Home do professor: devolvidos.

## E8 — Mapa de desenvolvimento
- Por turma/criança: campos e habilidades BNCC com e sem evidência (observações + avaliações);
  alerta à coordenação antes do fechamento do bimestre.

## E3 — Histórico do aluno (prontuário único)
- Perfil = linha do tempo: matrículas, frequência, notas/relatórios, PEI, observações, ocorrências,
  autorizações, financeiro (direção). Exportável.

## E4 — Agenda: notificações
- Trigger (pg_net) → `/api/hooks/*` → e-mail (Resend) para comunicado novo, documento aprovado, cobrança emitida.

## E5 — Operação
- Chamada "de hoje" pelo celular; convite por e-mail; lazy-load; testes de API.

Fora do horizonte: app nativo, garantia de recebíveis, rematrícula online, integrações com outros ERPs.
