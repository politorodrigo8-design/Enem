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
  const supportEmail = input.supportEmail ?? "suporte@pontuaenem.com.br";
  const productName = input.productName ?? "Pontua Enem Completo";

  const templates: Record<TransactionalEmailKey, { subject: string; body: string }> = {
    purchase_confirmation: {
      subject: `Compra recebida: ${productName}`,
      body: `Recebemos seu pedido do ${productName}. A liberação ocorre após confirmação segura do pagamento.`,
    },
    payment_pending: {
      subject: "Pagamento pendente",
      body: "Seu pagamento ainda está pendente. Avisaremos quando o provedor confirmar.",
    },
    payment_rejected: {
      subject: "Pagamento não aprovado",
      body: `O pagamento não foi aprovado. Você pode tentar novamente ou falar com ${supportEmail}.`,
    },
    access_granted: {
      subject: `Acesso liberado ao ${productName}`,
      body: `Seu acesso foi liberado até ${input.accessValidUntil ?? "a data configurada do produto"}.`,
    },
    refund_processed: {
      subject: "Reembolso processado",
      body: "Seu reembolso foi processado conforme o fluxo do provedor de pagamento.",
    },
    access_expiring: {
      subject: "Seu acesso está perto de expirar",
      body: `Seu acesso ao ${productName} está perto da data de validade.`,
    },
    access_expired: {
      subject: "Seu acesso expirou",
      body: `Seu acesso ao ${productName} expirou. Não há renovação automática.`,
    },
  };

  return templates[key];
}
