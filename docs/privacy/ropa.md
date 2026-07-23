# ROPA simplificado - Pontua Enem

Documento interno. Não publicar no site.

Versão de referência dos documentos públicos: 2026-07-23.

## Pendências jurídicas e empresariais

- Definir razão social ou nome do fornecedor/controlador.
- Definir CPF/CNPJ, endereço ou domicílio aplicável.
- Definir encarregado/DPO, se aplicável.
- Confirmar se haverá e-mail dedicado `privacidade@pontuaenem.com.br`; até lá, o canal público é `suporte@pontuaenem.com.br`.
- Validar política proporcional para adolescentes e eventual coleta de data de nascimento.
- Validar prazos jurídicos de retenção por categoria.
- Validar termos do fornecedor de IA sobre retenção, treinamento e transferência internacional.

## Operações

| Operação | Dados | Titulares | Finalidade | Base legal a validar | Operadores | Transferência internacional | Retenção | Eliminação | Segurança |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Cadastro | Nome, e-mail, senha processada pelo Supabase, identificador de usuário, aceites legais | Estudantes/usuários | Criar conta e registrar manifestação jurídica | Contrato, procedimentos preliminares, exercício de direitos | Supabase, Vercel | Possível | Enquanto conta ativa e prazo necessário para direitos | Exclusão de conta e cascatas aplicáveis | RLS, auth Supabase, registro servidor |
| Autenticação | E-mail, senha processada pelo Supabase, cookies de sessão | Usuários | Login, sessão e recuperação de senha | Contrato, segurança | Supabase, Vercel | Possível | Enquanto sessão/conta for necessária | Encerramento de sessão/exclusão | Cookies essenciais, HTTPS |
| Aceite jurídico | Usuário, documento, versão, contexto, pedido/produto quando aplicável, metadata mínima | Usuários | Comprovar aceite de cadastro, checkout e reaceite | Contrato, obrigação, exercício de direitos | Supabase | Possível | Necessário para auditoria e defesa de direitos | Vinculada à conta, salvo retenção legal | RLS sem insert/update/delete pelo cliente |
| Compra do acesso | Produto, preço, pedido, status, e-mail pagador, IDs Mercado Pago | Usuários compradores | Criar checkout e liberar acesso após pagamento | Contrato, obrigação legal, exercício de direitos | Mercado Pago, Supabase, Vercel | Possível | Prazo contratual/legal | Retenção conforme obrigação e direitos | Webhook como fonte de verdade |
| Compra de créditos | Pacote, valor, créditos, pedido, aceite, status | Usuários compradores | Comprar unidades internas de uso | Contrato, obrigação legal, exercício de direitos | Mercado Pago, Supabase, Vercel | Possível | Ledger mantido para auditoria | Ajuste/estorno quando aplicável | Produto/preço validados no servidor |
| Webhook | Evento, hash do payload, ID de pagamento, status, pedido | Usuários compradores | Confirmar, estornar ou rejeitar pagamento | Contrato, segurança, exercício de direitos | Mercado Pago, Supabase, Vercel | Possível | Necessária para auditoria | Conforme obrigação/direitos | Assinatura quando configurada, idempotência |
| Desempenho e questões | Respostas, acertos, tempo, tópicos, revisões, favoritos | Usuários | Executar prática, Radar e revisão | Contrato | Supabase, Vercel | Possível | Enquanto conta ativa/serviço | Exclusão de conta | RLS por usuário e acesso |
| Simulados | Tentativas, respostas, pontuação, status | Usuários | Simulados e desempenho | Contrato | Supabase, Vercel | Possível | Enquanto conta ativa/serviço | Exclusão de conta | RLS por usuário |
| Diagnóstico e plano | Preferências, dificuldades, metas, horas, plano semanal | Usuários | Personalizar estudo | Contrato | Supabase, Vercel | Possível | Enquanto conta ativa/serviço | Exclusão/atualização | RLS por usuário |
| Recursos de IA | Questões, alternativas, gabarito, explicação, métricas, rotina, metas, prioridades | Usuários | Gerar explicação, análise e plano inteligente | Contrato; avaliar legítimo interesse para segurança | Groq, Supabase, Vercel | Provável | Logs mínimos e ledger; saída na UI | Estorno em falha de IA | Créditos reservados/estornados, prompts sem nome/e-mail |
| Redações | Tema, observação, texto digitado, arquivos, status, correção, eventos | Usuários | Receber, corrigir e devolver redação | Contrato | Supabase, Vercel, equipe de correção | Possível | Necessária para histórico e entrega | Exclusão conforme conta/solicitação aplicável | Bucket privado, URLs assinadas, tipo/tamanho limitados |
| Suporte | Mensagens e dados necessários para localizar conta/pedido | Usuários | Atendimento e solução de problemas | Contrato, legítimo interesse, exercício de direitos | Serviço de e-mail/suporte a definir | Possível | Pelo período necessário ao atendimento e direitos | Exclusão conforme solicitação aplicável | Minimização e canal oficial |
| Logs e segurança | IP, user agent, eventos técnicos, rate limit | Usuários/visitantes | Segurança, fraude e diagnóstico | Legítimo interesse, obrigação, exercício de direitos | Vercel, Supabase | Possível | Critério técnico e necessidade | Expiração/rotação | Rate limit, hashes, sem segredos |
| Cookies | Cookies essenciais de sessão/autenticação | Usuários | Manter login e funcionamento | Contrato/segurança | Supabase, Vercel | Possível | Sessão ou prazo técnico | Logout/expiração | Somente necessários; sem pixels identificados |
| Exclusão de conta | Perfil, progresso, redações, arquivos, créditos e registros relacionados | Usuários | Atender solicitação e encerrar conta | LGPD e contrato | Supabase, Vercel | Possível | Retenção residual para obrigação/direitos | Cascatas, remoção/anonimização a validar | RLS e operação autenticada/admin |

## Observações técnicas

- O fluxo atual de redações é manual/humano: a redação entra em fila e pode ser assumida por administradores/corretores.
- Não foi encontrado envio de redações para a Groq no código atual.
- Não foram encontradas bibliotecas de analytics, Meta Pixel, Google Analytics ou cookies não essenciais.
- O único `localStorage` encontrado guarda prioridades importadas temporárias para plano inteligente no navegador.
- O webhook do Mercado Pago permanece fonte de verdade para aprovar pagamento e liberar acesso/créditos.
