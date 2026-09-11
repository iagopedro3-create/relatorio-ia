# Contrato de Tratamento de Dados Pessoais (DPA)

**MINUTA — revisar com advogado(a) antes de usar.**

Anexo ao Contrato de Assinatura da plataforma Althion Education
("Plataforma"), celebrado entre **[RAZÃO SOCIAL DA OPERADORA]**, CNPJ
**[CNPJ]** ("Operadora"), e **[RAZÃO SOCIAL DA ESCOLA]**, CNPJ **[CNPJ]**
("Controladora").

## 1. Objeto

Regular o tratamento de dados pessoais realizado pela Operadora em nome da
Controladora, nos termos da Lei nº 13.709/2018 (LGPD), no âmbito do uso da
Plataforma para gestão pedagógica: cadastro de alunos e equipe, frequência,
notas, relatórios descritivos e planos educacionais individualizados gerados
com apoio de inteligência artificial, planejamento de aulas e agenda.

## 2. Natureza e finalidade

A Operadora trata os dados **exclusivamente** para prestar o serviço
contratado, conforme instruções documentadas da Controladora (as
funcionalidades da Plataforma e este contrato). É vedado tratar os dados para
finalidade própria, inclusive treinar modelos de IA.

## 3. Dados e titulares

Alunos (crianças e adolescentes), seus responsáveis legais e a equipe da
escola. Categorias: identificação, dados acadêmicos e, quando a Controladora
optar pelo PEI, **dados de saúde (diagnóstico)** — dado sensível cujo
consentimento específico é obrigação da Controladora obter e guardar.

## 4. Obrigações da Operadora

1. Tratar os dados somente conforme as instruções da Controladora.
2. Garantir que pessoas autorizadas estejam sob dever de confidencialidade.
3. Manter medidas técnicas e administrativas de segurança, incluindo: isolamento
   lógico por escola (RLS), controle de acesso por papel, criptografia em
   trânsito, segregação de credenciais (chaves de IA e administrativas apenas
   no servidor), registro de uso.
4. Enviar aos suboperadores de IA **apenas o mínimo necessário** (primeiro
   nome, idade, turma e observações pedagógicas), nunca sobrenome, data de
   nascimento, CPF, contato dos responsáveis ou imagens.
5. Auxiliar a Controladora no atendimento a direitos dos titulares e em
   avaliações de impacto, quando cabível.
6. Comunicar incidentes de segurança em até **48 horas** após tomar ciência,
   com a descrição do ocorrido, dados afetados e medidas adotadas.
7. Ao término do contrato, disponibilizar exportação completa dos dados e
   eliminá-los em até **30 dias**, salvo obrigação legal de guarda.
8. Manter registro dos suboperadores e informar alterações com antecedência
   mínima de 15 dias, cabendo à Controladora opor-se por motivo razoável.

## 5. Suboperadores autorizados

| Suboperador | Serviço | Local |
|---|---|---|
| Supabase Inc. | Banco de dados, autenticação, armazenamento | [região do projeto] |
| Vercel Inc. | Hospedagem do aplicativo e funções | Global (edge) / [região] |
| [Google LLC / OpenAI] | Geração de texto por IA (dados minimizados) | EUA |

Transferência internacional: realizada com base no art. 33, com cláusulas
contratuais padrão dos suboperadores e minimização descrita no item 4.4.

## 6. Obrigações da Controladora

1. Possuir base legal para todos os dados inseridos, inclusive **consentimento
   específico e destacado** dos responsáveis para dados de saúde (PEI).
2. Informar os titulares (política de privacidade da escola) sobre o uso da
   Plataforma e de IA na redação de documentos pedagógicos.
3. Gerir os acessos de sua equipe (criar, desativar usuários) e a exatidão dos
   dados.
4. Responder aos pedidos dos titulares.

## 7. Auditoria

A Controladora pode solicitar, uma vez ao ano, informações e evidências
razoáveis sobre as medidas de segurança adotadas.

## 8. Responsabilidade

Cada parte responde pelos danos que causar por descumprimento da LGPD ou
deste contrato, nos termos dos arts. 42 a 45 da LGPD.

## 9. Vigência

Vigora enquanto durar o contrato de assinatura e, quanto às obrigações de
confidencialidade e eliminação, até seu integral cumprimento.

**Encarregado(a) da Operadora:** [nome] — [e-mail]
**Encarregado(a) da Controladora:** [nome] — [e-mail]

[Local], [data].

_______________________________        _______________________________
Operadora                              Controladora
