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
          title: product.product_name,
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
    throw new Error(payload?.message ?? "Mercado Pago recusou a preferencia.");
  }

  // Produção deve usar init_point. sandbox_init_point só quando explicitamente
  // habilitado, senão o pagante é enviado para o ambiente de testes do MP.
  const useSandbox = process.env.MERCADO_PAGO_SANDBOX === "true";
  const checkoutUrl = useSandbox
    ? String(payload.sandbox_init_point || payload.init_point || "")
    : String(payload.init_point || "");
  if (!checkoutUrl.startsWith("https://")) {
    throw new Error("Mercado Pago retornou URL de checkout invalida.");
  }

  return {
    providerOrderId: String(payload.id),
    checkoutUrl,
  };
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
      payload?.message ?? "Nao foi possivel consultar o pagamento.",
      {
        status: response.status,
        statusText: response.statusText,
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
    throw new MercadoPagoConfigurationError("MERCADO_PAGO_ACCESS_TOKEN nao configurado.");
  }
  if (problem === "public_key_matches_access_token") {
    throw new MercadoPagoConfigurationError(
      "MERCADO_PAGO_ACCESS_TOKEN nao pode ser igual a NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY.",
    );
  }

  return process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim() ?? "";
}

export class MercadoPagoConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MercadoPagoConfigurationError";
  }
}

export class MercadoPagoApiError extends Error {
  status: number;
  statusText: string;

  constructor(message: string, { status, statusText }: { status: number; statusText: string }) {
    super(message);
    this.name = "MercadoPagoApiError";
    this.status = status;
    this.statusText = statusText;
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
  };
};
