export type TransactionalEmailKey =
  | "purchase_confirmation"
  | "payment_pending"
  | "payment_rejected"
  | "access_granted"
  | "refund_processed"
  | "access_expiring"
  | "access_expired";

type TemplateInput = {
  name?: string;
  productName?: string;
  price?: string;
  accessValidUntil?: string;
  supportEmail?: string;
};

export function renderTransactionalEmail(
  key: TransactionalEmailKey,
  input: TemplateInput = {},
) {
  const supportEmail = input.supportEmail ?? "suporte@nexoenem.com";
  const productName = input.productName ?? "NexoENEM Completo";

  const templates: Record<TransactionalEmailKey, { subject: string; body: string }> = {
    purchase_confirmation: {
      subject: `Compra recebida: ${productName}`,
      body: `Recebemos seu pedido do ${productName}. A liberacao ocorre apos confirmacao segura do pagamento.`,
    },
    payment_pending: {
      subject: "Pagamento pendente",
      body: "Seu pagamento ainda esta pendente. Avisaremos quando o provedor confirmar.",
    },
    payment_rejected: {
      subject: "Pagamento nao aprovado",
      body: `O pagamento nao foi aprovado. Voce pode tentar novamente ou falar com ${supportEmail}.`,
    },
    access_granted: {
      subject: `Acesso liberado ao ${productName}`,
      body: `Seu acesso foi liberado ate ${input.accessValidUntil ?? "a data configurada do produto"}.`,
    },
    refund_processed: {
      subject: "Reembolso processado",
      body: "Seu reembolso foi processado conforme o fluxo do provedor de pagamento.",
    },
    access_expiring: {
      subject: "Seu acesso esta perto de expirar",
      body: `Seu acesso ao ${productName} esta perto da data de validade.`,
    },
    access_expired: {
      subject: "Seu acesso expirou",
      body: `Seu acesso ao ${productName} expirou. Nao ha renovacao automatica.`,
    },
  };

  return templates[key];
}
