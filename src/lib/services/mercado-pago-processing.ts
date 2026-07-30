import type { SupabaseClient } from "@supabase/supabase-js";
import type { MercadoPagoPayment } from "@/lib/services/mercado-pago";
import type { Order, Product } from "@/lib/services/billing";
import type { Database, Json } from "@/lib/supabase/types";
import {
  getMercadoPagoPaymentOrderId,
  getMercadoPagoPaymentProcessingDecision,
} from "@/lib/services/mercado-pago-processing-rules.mjs";
import { buildTikTokBrowserPurchase } from "@/lib/services/tiktok-events-payload.mjs";
import {
  isTikTokEventsConfigured,
  sendTikTokPurchaseEvent,
} from "@/lib/services/tiktok-events";

export type TikTokBrowserPurchase = {
  event_id: string;
  properties: Record<string, unknown>;
};

type OrderWithProduct = Order & { products: Product | Product[] | null };
type ProcessingSource = "webhook" | "success_reconciliation";
type ProcessingStatus = "approved" | "pending" | "rejected" | "ignored";

export type MercadoPagoApprovedPaymentProcessingResult = {
  status: ProcessingStatus;
  orderId: string | null;
  access: "granted" | "already_granted" | "not_granted";
  reason: string;
  // Espelho do Purchase enviado ao TikTok pelo servidor. Vai até a página de
  // retorno para o Pixel reportar a MESMA compra com o MESMO event_id.
  tiktokPurchase?: TikTokBrowserPurchase | null;
};

export class MercadoPagoPaymentProcessingError extends Error {
  reason: string;

  constructor(reason: string, message = "Pagamento Mercado Pago nao passou nas validacoes.") {
    super(message);
    this.name = "MercadoPagoPaymentProcessingError";
    this.reason = reason;
  }
}

export async function processApprovedMercadoPagoPayment({
  supabase,
  payment,
  expectedUserId,
  source,
}: {
  supabase: SupabaseClient<Database>;
  payment: MercadoPagoPayment;
  expectedUserId?: string | null;
  source: ProcessingSource;
}): Promise<MercadoPagoApprovedPaymentProcessingResult> {
  const orderId = getMercadoPagoPaymentOrderId(payment);

  logPaymentProcessing("payment status checked", {
    source,
    status: payment.status,
    hasOrderReference: Boolean(orderId),
  });

  if (payment.status === "pending" || payment.status === "in_process") {
    return { status: "pending", orderId, access: "not_granted", reason: "payment_pending" };
  }
  if (payment.status !== "approved") {
    return { status: "rejected", orderId, access: "not_granted", reason: "payment_not_approved" };
  }
  if (!orderId) {
    throw new MercadoPagoPaymentProcessingError("missing_order_reference");
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*, products (*)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new MercadoPagoPaymentProcessingError("order_not_found", orderError?.message);
  }

  const checkedOrder = order as OrderWithProduct;
  const product = Array.isArray(checkedOrder.products)
    ? checkedOrder.products[0]
    : checkedOrder.products;
  const decision = getMercadoPagoPaymentProcessingDecision({
    payment,
    order: checkedOrder,
    product,
    expectedUserId: expectedUserId ?? null,
  });

  if (decision.action === "invalid") {
    throw new MercadoPagoPaymentProcessingError(decision.reason);
  }
  if (decision.action === "pending") {
    return { status: "pending", orderId: checkedOrder.id, access: "not_granted", reason: decision.reason };
  }
  if (decision.action === "rejected" || decision.action === "ignored") {
    return { status: decision.action === "rejected" ? "rejected" : "ignored", orderId: checkedOrder.id, access: "not_granted", reason: decision.reason };
  }

  logPaymentProcessing("order matched", {
    source,
    orderId: checkedOrder.id,
    userMatched: true,
    productMatched: true,
  });

  await registerProviderPaymentId({
    supabase,
    order: checkedOrder,
    payment,
    source,
  });

  // Aqui só chegam pagamentos aprovados, pelos dois caminhos (webhook e
  // reconciliação da página de retorno). É a fonte da verdade do Purchase: quem
  // paga por Pix ou boleto no app do banco muitas vezes nunca volta ao site, e
  // o Pixel do navegador nunca dispararia. A dedup por event_id no TikTok
  // garante uma única conversão mesmo quando os dois canais reportam.
  await reportTikTokPurchase({
    supabase,
    order: checkedOrder,
    product,
    source,
  });
  // Mesma regra do envio pelo servidor: só a compra de acesso é a conversão da
  // campanha, e o Pixel não pode reportar nada que o servidor não reporte.
  const tiktokPurchase =
    product?.product_kind === "access"
      ? ((buildTikTokBrowserPurchase({
          orderId: checkedOrder.id,
          amountCents: checkedOrder.amount_cents,
          currency: checkedOrder.currency,
          contentId: product?.slug ?? null,
          contentName: product?.product_name ?? null,
        }) ?? null) as TikTokBrowserPurchase | null)
      : null;

  if (decision.action === "already_granted") {
    logPaymentProcessing("access already granted", {
      source,
      orderId: checkedOrder.id,
    });
    return {
      status: "approved",
      orderId: checkedOrder.id,
      access: "already_granted",
      reason: decision.reason,
      tiktokPurchase,
    };
  }

  const { error: grantError } = await supabase.rpc("grant_paid_access_for_order" as never, {
    target_order_id: checkedOrder.id,
  } as never);
  if (grantError) throw new Error(grantError.message);

  const { error: referralError } = await supabase.rpc(
    "process_referral_purchase_for_order" as never,
    {
      target_order_id: checkedOrder.id,
      input_provider_payment_id: String(payment.id),
    } as never,
  );
  if (referralError) throw new Error(referralError.message);

  const { error: pendingReferralError } = await supabase.rpc(
    "process_pending_referral_rewards" as never,
    { target_referrer_user_id: null } as never,
  );
  if (pendingReferralError) throw new Error(pendingReferralError.message);

  logPaymentProcessing("access granted", {
    source,
    orderId: checkedOrder.id,
  });

  return {
    status: "approved",
    orderId: checkedOrder.id,
    access: "granted",
    reason: decision.reason,
    tiktokPurchase,
  };
}

async function reportTikTokPurchase({
  supabase,
  order,
  product,
  source,
}: {
  supabase: SupabaseClient<Database>;
  order: Order;
  product: Product | null | undefined;
  source: ProcessingSource;
}) {
  if (!isTikTokEventsConfigured()) return;
  // Purchase é a conversão de AQUISIÇÃO otimizada na campanha. Recarga de
  // crédito é receita de quem já é cliente: contar aqui infla a contagem de
  // conversão do anúncio e ensina o algoritmo com o público errado.
  if (product?.product_kind !== "access") return;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();
    const email = (profile as { email?: string | null } | null)?.email ?? null;

    await sendTikTokPurchaseEvent({
      orderId: order.id,
      userId: order.user_id,
      email,
      amountCents: order.amount_cents,
      currency: order.currency,
      productSlug: product?.slug ?? null,
      productName: product?.product_name ?? null,
      orderMetadata: order.metadata,
    });
  } catch (error) {
    // Publicidade nunca pode impedir a entrega do acesso pago.
    console.error("[payments:mercado-pago] tiktok purchase report failed", {
      source,
      orderId: order.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function registerProviderPaymentId({
  supabase,
  order,
  payment,
  source,
}: {
  supabase: SupabaseClient<Database>;
  order: Order;
  payment: MercadoPagoPayment;
  source: ProcessingSource;
}) {
  const metadata = isPlainObject(order.metadata) ? order.metadata : {};
  const nextMetadata: Record<string, Json> = {
    ...metadata,
    provider_payment_id: String(payment.id),
    provider_payment_status: payment.status,
    payment_processing_source: source,
  };

  const { error } = await supabase
    .from("orders")
    .update({ metadata: nextMetadata } as never)
    .eq("id", order.id);

  if (error) throw new Error(error.message);
}

function isPlainObject(value: unknown): value is Record<string, Json> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function logPaymentProcessing(message: string, context: Record<string, unknown>) {
  console.info("[payments:mercado-pago] processing", {
    message,
    ...context,
  });
}
