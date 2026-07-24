import crypto from "node:crypto";
import { getSiteUrl } from "@/lib/supabase/config";
import type { Order, Product } from "@/lib/services/billing";
import { getMercadoPagoCredentialProblem } from "@/lib/services/payment-security.mjs";

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
  const accessToken = getMercadoPagoAccessToken();

  const siteUrl = getSiteUrl();
  const orderMetadata = isPlainObject(order.metadata) ? order.metadata : {};
  const response = await fetch(`${API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
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
      notification_url: `${siteUrl}/api/payments/webhook`,
      auto_return: "approved",
    }),
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "Mercado Pago recusou a preferência.");
  }

  // Produção deve usar init_point. sandbox_init_point só quando explicitamente
  // habilitado, senão o pagante é enviado para o ambiente de testes do MP.
  const useSandbox = process.env.MERCADO_PAGO_SANDBOX === "true";
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
  const accessToken = getMercadoPagoAccessToken();

  const response = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
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

export function verifyMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
  secret,
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
  secret: string;
}) {
  if (!xSignature || !secret) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    }),
  );
  const timestamp = parts.ts;
  const expected = parts.v1;
  if (!timestamp || !expected) return false;

  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${timestamp};`;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return safeEqual(digest, expected);
}

function safeEqual(left: string, right: string) {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }

  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function getMercadoPagoAccessToken() {
  const problem = getMercadoPagoConfigurationProblem();
  if (problem === "missing_access_token") {
    throw new MercadoPagoConfigurationError("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
  }
  if (problem === "public_key_matches_access_token") {
    throw new MercadoPagoConfigurationError(
      "MERCADO_PAGO_ACCESS_TOKEN não pode ser igual a NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY.",
    );
  }

  return process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() ?? "";
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
