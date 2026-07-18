import crypto from "node:crypto";
import { getSiteUrl } from "@/lib/supabase/config";
import type { Order, Product } from "@/lib/services/billing";

const API_BASE = "https://api.mercadopago.com";

export function isMercadoPagoConfigured() {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim());
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
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN nao configurado.");
  }

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
      notification_url: `${siteUrl}/api/payments/webhook?source_news=webhooks`,
      auto_return: "approved",
    }),
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

  return {
    providerOrderId: String(payload.id),
    checkoutUrl,
  };
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN nao configurado.");
  }

  const response = await fetch(`${API_BASE}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message ?? "Nao foi possivel consultar o pagamento.");
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
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
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
