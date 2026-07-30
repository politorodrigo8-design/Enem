import type { SupabaseClient } from "@supabase/supabase-js";
import type { MercadoPagoPayment } from "@/lib/services/mercado-pago";
import type { Order, Product } from "@/lib/services/billing";
import type { Database, Json } from "@/lib/supabase/types";
import {
  getMercadoPagoPaymentOrderId,
  getMercadoPagoPaymentProcessingDecision,
} from "@/lib/services/mercado-pago-processing-rules.mjs";
import { buildTikTokBrowserPurchase } from "@/lib/services/tiktok-events-payload.mjs";
import { sendTikTokPurchaseEvent } from "@/lib/services/tiktok-events";

export type TikTokBrowserPurchase = {
  event_id: string;
  properties: Record<string, unknown>;
};

// Marca de idempotência do envio ao TikTok, gravada em orders.metadata.
const TIKTOK_REPORTED_AT_KEY = "tiktok_purchase_reported_at";

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
  // Para onde mandar o comprador. Depende do que ele comprou: quem recarregou
  // crédito quer ver o saldo novo, não o dashboard.
  redirectTo?: string;
};

function postPurchaseDestination(product: Product | null | undefined) {
  return product?.product_kind === "credit_package" ? "/dashboard/creditos" : "/dashboard";
}

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
      redirectTo: postPurchaseDestination(product),
      // O envio já foi marcado no processamento original. Reabrir a página de
      // retorno dias depois não pode gerar conversão nova.
      tiktokPurchase: await reportTikTokPurchase({
        supabase,
        order: checkedOrder,
        product,
        source,
      }),
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

  // Depois do grant, de propósito: publicidade não pode atrasar nem derrubar a
  // entrega do produto pago. Se a API do TikTok estiver lenta, quem já pagou já
  // tem acesso quando esta linha executa.
  const tiktokPurchase = await reportTikTokPurchase({
    supabase,
    order: checkedOrder,
    product,
    source,
  });

  return {
    status: "approved",
    orderId: checkedOrder.id,
    access: "granted",
    reason: decision.reason,
    tiktokPurchase,
    redirectTo: postPurchaseDestination(product),
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
  // Purchase é a conversão de AQUISIÇÃO otimizada na campanha. Recarga de
  // crédito é receita de quem já é cliente: contar aqui infla a contagem de
  // conversão do anúncio e ensina o algoritmo com o público errado.
  if (product?.product_kind !== "access") return null;
  // O check de configuração vive só dentro de sendTikTokPurchaseEvent, que loga
  // o motivo. Duplicar aqui fazia a compra de acesso sair sem log nenhum quando
  // faltava variável de ambiente — indistinguível de recusa do TikTok.

  try {
    // Releitura proposital: registerProviderPaymentId acabou de reescrever o
    // metadata, e é dele que saem os sinais de atribuição e a marca de envio.
    const { data: fresh } = await supabase
      .from("orders")
      .select("metadata")
      .eq("id", order.id)
      .maybeSingle();
    const freshMetadata = (fresh as { metadata?: unknown } | null)?.metadata;
    const metadata: Record<string, Json> = isPlainObject(freshMetadata) ? freshMetadata : {};

    // A dedup do TikTok por event_id só cobre 48h. Sem uma trava persistida,
    // reabrir a página de retorno depois disso contaria uma segunda conversão
    // com o mesmo pedido. Uma compra reporta uma vez, para sempre.
    if (metadata[TIKTOK_REPORTED_AT_KEY]) {
      logPaymentProcessing("tiktok purchase already reported", {
        source,
        orderId: order.id,
        reportedAt: String(metadata[TIKTOK_REPORTED_AT_KEY]),
      });
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", order.user_id)
      .maybeSingle();
    const email = (profile as { email?: string | null } | null)?.email ?? null;

    const enviado = await sendTikTokPurchaseEvent({
      orderId: order.id,
      userId: order.user_id,
      email,
      amountCents: order.amount_cents,
      currency: order.currency,
      productSlug: product.slug,
      productName: product.product_name,
      orderMetadata: metadata,
    });

    if (!enviado) return null;

    const { error: markError } = await supabase
      .from("orders")
      .update({
        metadata: { ...metadata, [TIKTOK_REPORTED_AT_KEY]: new Date().toISOString() },
      } as never)
      .eq("id", order.id);
    if (markError) {
      // Sem a marca, uma revisita futura pode duplicar. Precisa ser visível.
      console.error("[payments:mercado-pago] falha ao marcar purchase reportado", {
        source,
        orderId: order.id,
        message: markError.message,
      });
    }

    // O espelho do navegador só existe quando o servidor de fato reportou agora.
    // Assim os dois canais nunca divergem sobre o que foi contado.
    return (buildTikTokBrowserPurchase({
      orderId: order.id,
      amountCents: order.amount_cents,
      currency: order.currency,
      contentId: product.slug,
      contentName: product.product_name,
    }) ?? null) as TikTokBrowserPurchase | null;
  } catch (error) {
    // Publicidade nunca pode impedir a entrega do acesso pago.
    console.error("[payments:mercado-pago] tiktok purchase report failed", {
      source,
      orderId: order.id,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
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
