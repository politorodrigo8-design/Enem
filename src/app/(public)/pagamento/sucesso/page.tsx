import { PaymentSuccessReconciliation, type MercadoPagoReturnParams } from "./payment-success-reconciliation";

type PaymentSuccessPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <PaymentSuccessReconciliation
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

function pickParam(value: string | string[] | undefined): MercadoPagoReturnParams[keyof MercadoPagoReturnParams] {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
