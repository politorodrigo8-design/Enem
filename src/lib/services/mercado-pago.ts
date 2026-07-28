import crypto from "node:crypto";
import { getSiteUrl } from "@/lib/supabase/config";
import type { Order, Product } from "@/lib/services/billing";
import {
  getMercadoPagoCredentialAudit,
  getMercadoPagoCredentialProblem,
} from "@/lib/services/payment-security.mjs";

export { validateMercadoPagoWebhookSignature } from "@/lib/services/payment-webhook.mjs";

const API_BASE = "https://api.mercadopago.com";

export function isMercadoPagoConfigured() {
  return !getMercadoPagoConfigurationProblem();
}

export function getMercadoPagoConfigurationProblem() {
  return getMercadoPagoCredentialProblem({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    publicKey: process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY,
  });
}

export async function createMercadoPagoPreference({
  product,
  order,
  userEmail,
}: {
  product: Product;
  order: Order;
  userEmail: string;
}) {
  const credentials = getMercadoPagoAccessTokenDetails();

  const siteUrl = getSiteUrl();
  const useSandbox = process.env.MERCADO_PAGO_SANDBOX === "true";
  // Sem notification_url a entrega do acesso depende do comprador voltar ao
  // site: quem paga por Pix ou boleto no app do banco e fecha o navegador
  // ficaria pagando sem receber. O Mercado Pago só aceita HTTPS aqui, então em
  // desenvolvimento (http://localhost) o campo é omitido e a liberação continua
  // acontecendo pela reconciliação da página de retorno.
  const notificationUrl = siteUrl.startsWith("https://")
    ? `${siteUrl}/api/payments/webhook`
    : null;
  logMercadoPagoCredentialAudit("preference.create", {
    ...credentials.audit,
    sandboxEnabled: useSandbox,
    hasNotificationUrl: Boolean(notificationUrl),
  });
  const orderMetadata = isPlainObject(order.metadata) ? order.metadata : {};
  const response = await fetch(`${API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": order.id,
    },
    body: JSON.stringify({
      items: [
        {
          id: product.slug,
          title: getMercadoPagoItemTitle(product),
          quantity: 1,
          currency_id: "BRL",
          unit_price: order.amount_cents / 100,
        },
      ],
      payer: {
        email: userEmail,
      },
      external_reference: order.id,
      metadata: {
        order_id: order.id,
        product_id: product.id,
        user_id: order.user_id,
        referral_id: stringOrUndefined(orderMetadata.referral_id),
        referrer_user_id: stringOrUndefined(orderMetadata.referrer_user_id),
      },
      back_urls: {
        success: `${siteUrl}/pagamento/sucesso?order=${order.id}`,
        pending: `${siteUrl}/pagamento/pendente?order=${order.id}`,
        failure: `${siteUrl}/pagamento/falha?order=${order.id}`,
      },
      auto_return: "approved",
      ...(notificationUrl ? { notification_url: notificationUrl } : {}),
    }),
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "Mercado Pago recusou a preferência.");
  }

  // Produção deve usar init_point. sandbox_init_point só quando explicitamente
  // habilitado, senão o pagante é enviado para o ambiente de testes do MP.
  const checkoutUrl = useSandbox
    ? String(payload.sandbox_init_point || payload.init_point || "")
    : String(payload.init_point || "");
  if (!checkoutUrl.startsWith("https://")) {
    throw new Error("Mercado Pago retornou URL de checkout inválida.");
  }

  return {
    providerOrderId: String(payload.id),
    checkoutUrl,
  };
}

function getMercadoPagoItemTitle(product: Product) {
  if (product.product_kind === "credit_package" && product.credit_amount) {
    return `Pontua Enem - pacote de ${product.credit_amount} créditos`;
  }

  return product.product_name;
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const credentials = getMercadoPagoAccessTokenDetails();
  logMercadoPagoCredentialAudit("payment.fetch", {
    ...credentials.audit,
    hasNotificationUrl: false,
  });

  const response = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${credentials.accessToken}`,
    },
    cache: "no-store",
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new MercadoPagoApiError(
      payload?.message ?? "Não foi possível consultar o pagamento.",
      {
        paymentId,
        status: response.status,
        statusText: response.statusText,
        errorCode: typeof payload?.error === "string" ? payload.error : null,
      },
    );
  }

  return payload as MercadoPagoPayment;
}

export function hashPayload(rawBody: string) {
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}

function getMercadoPagoAccessTokenDetails() {
  const problem = getMercadoPagoConfigurationProblem();
  if (problem === "missing_access_token") {
    throw new MercadoPagoConfigurationError("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }
  if (problem === "public_key_matches_access_token") {
    throw new MercadoPagoConfigurationError(
      "MERCADO_PAGO_ACCESS_TOKEN não pode ser igual a NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY.",
    );
  }
  if (problem === "stripe_secret_key_used_as_mercado_pago_access_token") {
    throw new MercadoPagoConfigurationError(
      "MERCADO_PAGO_ACCESS_TOKEN parece conter uma chave secreta Stripe.",
    );
  }
  if (problem === "unexpected_access_token_prefix") {
    throw new MercadoPagoConfigurationError(
      "MERCADO_PAGO_ACCESS_TOKEN tem prefixo inesperado para Mercado Pago.",
    );
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() ?? "";
  return {
    accessToken,
    audit: getMercadoPagoCredentialAudit({
      accessToken,
      accessTokenVariable: "MERCADO_PAGO_ACCESS_TOKEN",
      sandbox: process.env.MERCADO_PAGO_SANDBOX === "true",
      notificationUrl: null,
    }),
  };
}

function logMercadoPagoCredentialAudit(
  operation: string,
  audit: ReturnType<typeof getMercadoPagoCredentialAudit>,
) {
  console.info("[payments:mercado-pago] credential audit", {
    operation,
    accessTokenVariable: audit.accessTokenVariable,
    accessTokenPrefix: audit.accessTokenPrefix,
    accessTokenLooksLikeMercadoPago: audit.accessTokenLooksLikeMercadoPago,
    accessTokenLooksLikeStripe: audit.accessTokenLooksLikeStripe,
    sandboxEnabled: audit.sandboxEnabled,
    hasNotificationUrl: audit.hasNotificationUrl,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export class MercadoPagoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoConfigurationError";
  }
}

export class MercadoPagoApiError extends Error {
  paymentId: string;
  status: number;
  statusText: string;
  errorCode: string | null;

  constructor(
    message: string,
    {
      paymentId,
      status,
      statusText,
      errorCode,
    }: { paymentId: string; status: number; statusText: string; errorCode?: string | null },
  ) {
    super(message);
    this.name = "MercadoPagoApiError";
    this.paymentId = paymentId;
    this.status = status;
    this.statusText = statusText;
    this.errorCode = errorCode ?? null;
  }
}

export type MercadoPagoPayment = {
  id: number | string;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back";
  transaction_amount: number;
  currency_id: string;
  external_reference?: string;
  metadata?: {
    order_id?: string;
    product_id?: string;
    user_id?: string;
    referral_id?: string;
    referrer_user_id?: string;
  };
};
