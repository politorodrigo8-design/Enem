import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PaymentSuccessReconciliation, type MercadoPagoReturnParams } from "./payment-success-reconciliation";

type PaymentSuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = (await searchParams) ?? {};
  // Identidade do próprio comprador, usada só no Advanced Matching do Pixel.
  // Quem volta do app do banco sem sessão simplesmente não tem identidade aqui.
  const buyer = await getBuyerIdentity();

  return (
    <PaymentSuccessReconciliation
      buyer={buyer}
      initialParams={{
        payment_id: pickParam(params.payment_id),
        collection_id: pickParam(params.collection_id),
        collection_status: pickParam(params.collection_status),
        status: pickParam(params.status),
        external_reference: pickParam(params.external_reference),
        merchant_order_id: pickParam(params.merchant_order_id),
        preference_id: pickParam(params.preference_id),
      }}
    />
  );
}

async function getBuyerIdentity() {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return { id: user.id, email: user.email ?? null };
}

function pickParam(value: string | string[] | undefined): MercadoPagoReturnParams[keyof MercadoPagoReturnParams] {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
