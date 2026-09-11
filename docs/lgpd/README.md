# LGPD — como a plataforma trata dados pessoais

Este documento descreve, para a operação da plataforma e para as escolas
clientes, o desenho de proteção de dados do produto. Não substitui parecer
jurídico: **antes de vender, revise com advogado(a)** os três textos desta
pasta (DPA, política de privacidade e termo de consentimento do PEI).

## Papéis (art. 5º, LGPD)

| Quem | Papel | Por quê |
|---|---|---|
| Escola cliente | **Controladora** | Decide quais alunos, quais dados e para quê (matrícula, avaliação, PEI). |
| Plataforma (Althion Education) | **Operadora** | Trata os dados em nome da escola, conforme o contrato (`DPA.md`). |
| Provedor de IA (Google/OpenAI) | **Suboperador** | Recebe só o mínimo necessário para redigir o texto (ver abaixo). |
| Supabase / Vercel | **Suboperadores** | Hospedagem do banco e das funções. |

## Dados tratados

- **Alunos**: nome, data de nascimento, CPF (só para histórico escolar),
  nomes dos responsáveis, frequência, notas, relatórios descritivos, planos de
  aula. **Dado sensível**: diagnóstico clínico usado no PEI (art. 11).
- **Equipe e responsáveis**: nome, e-mail, papel na escola.
- **Uso de IA**: quem gerou, quando, qual recurso, tokens — **nunca o
  conteúdo** do prompt ou da resposta (`ai_usage`).

## Minimização no envio para IA (implementado no código)

Toda geração passa por `api/ai/generate.ts`. O payload que sai para o
provedor contém **apenas**:

- primeiro nome da criança (`firstNameOnly()` reforça no servidor mesmo que o
  front mande o nome completo);
- idade (número) e nome da turma;
- observações pedagógicas marcadas/escritas pela professora;
- no PEI, o diagnóstico informado pela professora.

**Não saem**: sobrenome, data de nascimento, CPF, nomes dos responsáveis,
e-mails, fotos, nem o nome da escola. O relatório volta redigido com o
primeiro nome e o front completa o cabeçalho do documento impresso.

## Base legal

- Cadastro, frequência, notas, relatórios: **execução de contrato** (art. 7º,
  V — contrato de prestação de serviços educacionais) e **cumprimento de
  obrigação legal** (LDB, art. 24).
- PEI (dado de saúde): **consentimento específico e destacado** do responsável
  (art. 11, I). O sistema **bloqueia a geração do PEI** enquanto
  `students.pei_consent_at` estiver nulo; a escola registra quem assinou
  (`pei_consent_by`). Use o modelo em `TERMO-CONSENTIMENTO-PEI.md`.

## Direitos dos titulares (art. 18)

A escola atende os pedidos; a plataforma dá os meios:

- **Acesso / portabilidade**: exportar dados do aluno (perfil, documentos,
  notas) — via backoffice, sob demanda da escola.
- **Correção**: a própria escola edita no sistema.
- **Eliminação**: excluir o aluno apaga em cascata matrículas, frequência,
  notas, documentos e resultados (`on delete cascade`).
- **Revogação do consentimento do PEI**: desmarcar no cadastro do aluno;
  PEIs já gerados devem ser excluídos pela escola se for o caso.

## Retenção

- Dados acadêmicos: pelo prazo legal de guarda da escola (histórico escolar
  é permanente; diários, em geral, 5 anos — confirmar com a secretaria de
  educação do estado). A escola é quem define; a plataforma não apaga sozinha.
- Ao encerrar o contrato: exportação completa e exclusão em até 30 dias, salvo
  ordem legal (ver `DPA.md`).
- Logs de uso de IA (`ai_usage`): 12 meses.

## Segurança (implementado)

- Autenticação Supabase Auth (senha com hash, e-mail de redefinição).
- **RLS em todas as tabelas**, com `school_id` em cada linha: um usuário só
  enxerga a própria escola; professor só as próprias turmas; responsável só
  os próprios filhos e documentos aprovados.
- Chave de IA e `service_role` só no servidor (`/api`), nunca no navegador.
- Usuário desativado é banido no Auth (não consegue logar).
- HTTPS obrigatório (Vercel); cabeçalhos `nosniff`, `X-Frame-Options`.

## Incidentes

Em caso de vazamento: a plataforma comunica a escola (controladora) em até
48h com o escopo; a escola avalia a comunicação à ANPD e aos titulares (art.
48). Registrar em `docs/lgpd/incidentes/` (criar quando houver).

## Pendências antes de vender

- [ ] Revisão jurídica de `DPA.md`, `POLITICA-PRIVACIDADE.md` e
      `TERMO-CONSENTIMENTO-PEI.md`.
- [ ] Nomear encarregado(a) (DPO) e publicar o contato na política.
- [ ] Confirmar os termos de tratamento do provedor de IA escolhido (Google
      AI Studio **não** deve ser usado em produção — usar Vertex AI ou a API
      paga do Gemini/OpenAI, que não treinam com os dados).
- [ ] Marcar `schools.dpa_signed_at` no backoffice quando a escola assinar.
