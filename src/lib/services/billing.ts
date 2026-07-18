import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];

export const DEFAULT_PRODUCT = {
  product_name: "NexoENEM Completo",
  slug: "nexoenem-completo-2026",
  regular_price_cents: 9990,
  sale_price_cents: null,
  sale_starts_at: null,
  sale_ends_at: null,
  access_valid_until: "2026-11-30T23:59:59-03:00",
  active: true,
  launch_ready: false,
} satisfies Partial<Product>;

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function getMockCheckoutState() {
  return {
    enabled: false,
    message:
      "Creditos avulsos nao estao a venda. O produto comercial atual e o NexoENEM Completo em pagamento unico.",
  };
}

export function getCurrentProductPrice(product: Pick<
  Product,
  "regular_price_cents" | "sale_price_cents" | "sale_starts_at" | "sale_ends_at" | "active"
>) {
  const now = Date.now();
  const saleStarts = product.sale_starts_at
    ? new Date(product.sale_starts_at).getTime()
    : null;
  const saleEnds = product.sale_ends_at
    ? new Date(product.sale_ends_at).getTime()
    : null;
  const saleActive =
    product.active &&
    product.sale_price_cents &&
    (!saleStarts || saleStarts <= now) &&
    (!saleEnds || saleEnds >= now);

  return saleActive ? product.sale_price_cents ?? product.regular_price_cents : product.regular_price_cents;
}

export async function getPublicProduct(): Promise<Product> {
  if (!isSupabaseConfigured()) {
    return fallbackProduct();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", DEFAULT_PRODUCT.slug)
    .eq("active", true)
    .maybeSingle();

  if (error || !data) {
    return fallbackProduct();
  }

  return data;
}

export async function getActiveProductForCheckout(
  supabase: SupabaseClient<Database>,
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", DEFAULT_PRODUCT.slug)
    .eq("active", true)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Produto ativo nao encontrado.");
  }

  return data as Product;
}

function fallbackProduct(): Product {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    product_name: DEFAULT_PRODUCT.product_name,
    slug: DEFAULT_PRODUCT.slug,
    regular_price_cents: DEFAULT_PRODUCT.regular_price_cents,
    sale_price_cents: null,
    sale_starts_at: null,
    sale_ends_at: null,
    access_valid_until: DEFAULT_PRODUCT.access_valid_until,
    active: true,
    launch_ready: false,
    checkout_provider: "mercado_pago",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
