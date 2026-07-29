# E-mails do Auth (confirmação e recuperação)

Quem monta e envia esses e-mails é o **Auth do Supabase**, não o app Next. O que o repositório
controla é o HTML, o assunto e por qual servidor eles saem.

| Peça | Onde mora |
|---|---|
| HTML dos e-mails | `supabase/templates/confirmation.html`, `supabase/templates/recovery.html` |
| Assunto + caminho do HTML | `[auth.email.template.*]` em `supabase/config.toml` |
| Servidor de envio (produção) | `[remotes.prod.auth.email.smtp]` em `supabase/config.toml` |
| Chave do Resend | `RESEND_SMTP_PASSWORD` no ambiente / `.env.local` — **nunca** versionada |
| Caixa de entrada local | Mailpit do stack local, `http://127.0.0.1:54324` |

## Configurar o Resend (uma vez)

1. No Resend, adicionar o domínio `pontuaenem.com.br` e publicar os registros DNS que ele gera
   (SPF, DKIM e, se oferecido, o CNAME de return-path). Sem domínio verificado o Resend só entrega
   para o e-mail da própria conta.
2. Criar uma API key com permissão de envio.
3. Guardar a chave em `.env.local` (já fora do versionamento):

   ```
   RESEND_SMTP_PASSWORD=<api key do Resend>
   ```

4. Publicar no projeto de produção — ver a seção seguinte.

Parâmetros SMTP do Resend (documentação oficial): host `smtp.resend.com`, portas 25/587/2587
(STARTTLS) ou 465/2465 (TLS implícito), usuário literalmente `resend`, senha = a API key.
O `config.toml` usa a porta 587.

## Publicar templates e SMTP em produção

### Caminho A — painel (não depende do CLI)

1. Auth → Email Templates: colar o conteúdo de cada arquivo de `supabase/templates/` no template
   correspondente (Confirm signup e Reset password) e ajustar o assunto conforme o `config.toml`.
2. Project Settings → Auth → SMTP Settings: preencher com os dados do Resend acima.

Rápido e sem efeito colateral, mas o painel passa a divergir do repositório — ao mudar o HTML aqui,
lembrar de recolar lá.

### Caminho B — `supabase config push`

```bash
supabase config push --project-ref vcwzolhfcrxjessezlad
```

O CLI pergunta serviço a serviço antes de aplicar. **Antes de confirmar o serviço `auth`**, conferir
no painel se existe configuração de auth que este arquivo não representa (provedores OAuth, MFA,
expiração de token): o push publica o bloco `auth` inteiro, e o que não estiver no `config.toml`
volta para o valor padrão. O bloco `[remotes.prod]` existe justamente para que `site_url`, limite de
e-mails e SMTP saiam com os valores de produção, e não com os de desenvolvimento.

## Ao editar os templates

- Manter `{{ .ConfirmationURL }}`. O callback em `src/app/auth/callback/route.ts` troca o `code` por
  sessão; trocar a variável por `{{ .TokenHash }}` quebra o fluxo.
- Estilo essencial sempre inline (Outlook e Gmail descartam boa parte do `<style>`); o bloco no
  `<head>` serve só para media queries e modo escuro.
- Imagens precisam de URL absoluta em `https://pontuaenem.com.br` e o e-mail tem que continuar legível
  com as imagens bloqueadas.
- Direção visual em `DESIGN.md`: papel `#fcfcfa`, azul-caneta `#1d4ed8`, marca-texto âmbar uma vez
  por e-mail, título em serifada (Georgia no lugar da Fraunces, que não carrega em cliente de e-mail).
- `magic_link`, `invite` e `email_change` continuam no template padrão do Supabase — nenhum fluxo do
  produto usa esses e-mails hoje. Ao ligar algum, criar o arquivo seguindo o mesmo layout.
