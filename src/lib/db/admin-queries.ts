import "server-only";

import { requireAdmin } from "@/lib/admin/guard";
import {
  averageTicketCents,
  bucketByDay,
  conversionRate,
  isOpenEssay,
  isOpenFeedback,
  isRefundedOrder,
  isRevenueOrder,
  netRevenueCents,
  percentChange,
  splitPeriods,
} from "@/lib/admin/rules.mjs";

type QueryError = { code?: string; message: string; details?: string; hint?: string } | null;

function logAdminQueryError(queryName: string, error: QueryError) {
  if (!error) return;
  console.error(`[Pontua Enem admin] ${queryName}`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

export type AdminOrder = {
  id: string;
  user_id: string;
  product_id: string;
  amount_cents: number;
  status: string;
  provider: string;
  provider_order_id: string | null;
  created_at: string;
  paid_at: string | null;
  metadata: unknown;
};

export type AdminProfileSummary = {
  id: string;
  full_name: string;
  email: string;
  access_level: string;
  access_expires_at: string | null;
  onboarding_completed: boolean;
  created_at: string;
};

export type AdminOverview = {
  revenue: {
    netCents: number;
    currentCents: number;
    previousCents: number;
    changePercent: number | null;
    averageTicketCents: number;
    paidOrders: number;
    refundedOrders: number;
    pendingOrders: number;
  };
  customers: {
    total: number;
    paying: number;
    admins: number;
    expired: number;
    newInPeriod: number;
    previousNew: number;
    changePercent: number | null;
    conversionPercent: number;
    onboardingCompleted: number;
  };
  essays: {
    open: number;
    pending: number;
    inReview: number;
    completed: number;
    unassigned: number;
    completedInPeriod: number;
  };
  feedbacks: { open: number; unread: number; total: number };
  engagement: {
    practiceSessions: number;
    answers: number;
    simulations: number;
    activeStudents: number;
  };
  credits: { outstanding: number; consumedInPeriod: number };
  referrals: { total: number; rewarded: number; pending: number };
  charts: {
    revenueByDay: { date: string; value: number }[];
    signupsByDay: { date: string; value: number }[];
    answersByDay: { date: string; value: number }[];
  };
  periodDays: number;
};

/**
 * Painel principal. Uma única passada por tabela e as agregações são feitas em
 * memória: o volume atual (milhares de linhas) cabe folgado e evita dezenas de
 * roundtrips que o PostgREST cobraria para cada recorte.
 */
export async function getAdminOverview(periodDays = 30): Promise<AdminOverview> {
  const { admin } = await requireAdmin();
  const since = new Date(Date.now() - periodDays * 2 * 24 * 60 * 60 * 1000).toISOString();

  const [
    ordersResult,
    profilesResult,
    essaysResult,
    feedbacksResult,
    sessionsResult,
    answersResult,
    simulationsResult,
    creditAccountsResult,
    creditLedgerResult,
    referralsResult,
  ] = await Promise.all([
    admin.from("orders").select("id,user_id,amount_cents,status,created_at,paid_at").limit(20000),
    admin
      .from("profiles")
      .select("id,access_level,access_expires_at,onboarding_completed,created_at")
      .limit(20000),
    admin.from("essay_submissions").select("id,status,assigned_admin_id,submitted_at,completed_at").limit(20000),
    admin.from("feedbacks").select("id,status,read_at,created_at").limit(20000),
    admin.from("practice_sessions").select("id,user_id,started_at").gte("started_at", since).limit(20000),
    admin.from("user_question_answers").select("id,user_id,answered_at").gte("answered_at", since).limit(20000),
    admin.from("user_simulations").select("id,user_id,started_at").gte("started_at", since).limit(20000),
    admin.from("credit_accounts").select("user_id,balance").limit(20000),
    admin.from("credit_ledger").select("id,amount,reason,created_at").gte("created_at", since).limit(20000),
    admin.from("referrals").select("id,status,created_at").limit(20000),
  ]);

  logAdminQueryError("overview.orders", ordersResult.error);
  logAdminQueryError("overview.profiles", profilesResult.error);
  logAdminQueryError("overview.essays", essaysResult.error);
  logAdminQueryError("overview.feedbacks", feedbacksResult.error);
  logAdminQueryError("overview.sessions", sessionsResult.error);
  logAdminQueryError("overview.answers", answersResult.error);
  logAdminQueryError("overview.simulations", simulationsResult.error);
  logAdminQueryError("overview.credit_accounts", creditAccountsResult.error);
  logAdminQueryError("overview.credit_ledger", creditLedgerResult.error);
  logAdminQueryError("overview.referrals", referralsResult.error);

  const orders = (ordersResult.data ?? []) as AdminOrder[];
  const profiles = (profilesResult.data ?? []) as AdminProfileSummary[];
  const essays = (essaysResult.data ?? []) as {
    status: string;
    assigned_admin_id: string | null;
    completed_at: string | null;
  }[];
  const feedbacks = (feedbacksResult.data ?? []) as { status: string; read_at: string | null }[];
  const sessions = (sessionsResult.data ?? []) as { user_id: string; started_at: string }[];
  const answers = (answersResult.data ?? []) as { user_id: string; answered_at: string }[];
  const simulations = (simulationsResult.data ?? []) as { user_id: string; started_at: string }[];
  const creditAccounts = (creditAccountsResult.data ?? []) as { balance: number }[];
  const creditLedger = (creditLedgerResult.data ?? []) as {
    amount: number;
    reason: string;
    created_at: string;
  }[];
  const referrals = (referralsResult.data ?? []) as { status: string }[];

  // Receita: a comparação usa paid_at, porque é quando o dinheiro entrou —
  // created_at marcaria a intenção de compra, não a venda.
  const paidOrders = orders.filter((order) => isRevenueOrder(order.status));
  const revenuePeriods = splitPeriods(paidOrders, {
    days: periodDays,
    dateKey: "paid_at",
  });
  const currentCents = netRevenueCents(revenuePeriods.current);
  const previousCents = netRevenueCents(revenuePeriods.previous);

  const signupPeriods = splitPeriods(profiles, { days: periodDays, dateKey: "created_at" });
  const payingProfiles = profiles.filter(
    (profile) => profile.access_level === "paid" || profile.access_level === "beta",
  );
  const now = Date.now();
  const expired = profiles.filter(
    (profile) =>
      profile.access_expires_at && new Date(profile.access_expires_at).getTime() <= now,
  );

  const completedEssays = essays.filter((essay) => essay.status === "completed");
  const essayCompletionCutoff = now - periodDays * 24 * 60 * 60 * 1000;

  const consumedCredits = creditLedger
    .filter((entry) => entry.amount < 0)
    .reduce((total, entry) => total + Math.abs(entry.amount), 0);

  return {
    revenue: {
      netCents: netRevenueCents(orders),
      currentCents,
      previousCents,
      changePercent: percentChange(currentCents, previousCents),
      averageTicketCents: averageTicketCents(orders),
      paidOrders: paidOrders.length,
      refundedOrders: orders.filter((order) => isRefundedOrder(order.status)).length,
      pendingOrders: orders.filter((order) => order.status === "pending").length,
    },
    customers: {
      total: profiles.length,
      paying: payingProfiles.length,
      admins: profiles.filter((profile) => profile.access_level === "admin").length,
      expired: expired.length,
      newInPeriod: signupPeriods.current.length,
      previousNew: signupPeriods.previous.length,
      changePercent: percentChange(signupPeriods.current.length, signupPeriods.previous.length),
      conversionPercent: conversionRate(payingProfiles.length, profiles.length),
      onboardingCompleted: profiles.filter((profile) => profile.onboarding_completed).length,
    },
    essays: {
      open: essays.filter((essay) => isOpenEssay(essay.status)).length,
      pending: essays.filter((essay) => essay.status === "pending").length,
      inReview: essays.filter((essay) => essay.status === "in_review").length,
      completed: completedEssays.length,
      unassigned: essays.filter((essay) => isOpenEssay(essay.status) && !essay.assigned_admin_id)
        .length,
      completedInPeriod: completedEssays.filter(
        (essay) => essay.completed_at && new Date(essay.completed_at).getTime() >= essayCompletionCutoff,
      ).length,
    },
    feedbacks: {
      open: feedbacks.filter((feedback) => isOpenFeedback(feedback.status)).length,
      unread: feedbacks.filter((feedback) => !feedback.read_at).length,
      total: feedbacks.length,
    },
    engagement: {
      practiceSessions: sessions.length,
      answers: answers.length,
      simulations: simulations.length,
      activeStudents: new Set([
        ...sessions.map((row) => row.user_id),
        ...answers.map((row) => row.user_id),
        ...simulations.map((row) => row.user_id),
      ]).size,
    },
    credits: {
      outstanding: creditAccounts.reduce((total, account) => total + (account.balance || 0), 0),
      consumedInPeriod: consumedCredits,
    },
    referrals: {
      total: referrals.length,
      rewarded: referrals.filter((referral) => referral.status === "reward_granted").length,
      pending: referrals.filter((referral) =>
        ["registered", "awaiting_purchase", "payment_confirmed", "pending_release"].includes(
          referral.status,
        ),
      ).length,
    },
    charts: {
      revenueByDay: bucketByDay(revenuePeriods.current, {
        days: periodDays,
        dateKey: "paid_at",
        amountOf: (order: { amount_cents?: number }) => (order.amount_cents ?? 0) / 100,
      }),
      signupsByDay: bucketByDay(signupPeriods.current, { days: periodDays }),
      answersByDay: bucketByDay(answers, { days: periodDays, dateKey: "answered_at" }),
    },
    periodDays,
  };
}

export type AdminCustomerRow = AdminProfileSummary & {
  orders: number;
  paidCents: number;
  lastOrderAt: string | null;
  essays: number;
  creditBalance: number;
  answers: number;
};

export type AdminCustomerFilters = {
  search?: string;
  level?: string;
  status?: string;
  sort?: string;
};

export async function getAdminCustomers(
  filters: AdminCustomerFilters = {},
): Promise<AdminCustomerRow[]> {
  const { admin } = await requireAdmin();

  let query = admin
    .from("profiles")
    .select("id,full_name,email,access_level,access_expires_at,onboarding_completed,created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (filters.level && filters.level !== "all") {
    query = query.eq("access_level", filters.level);
  }

  const search = filters.search?.trim();
  if (search) {
    // PostgREST exige escapar vírgula e parênteses dentro do or().
    const safe = search.replace(/[(),]/g, " ").trim();
    if (safe) query = query.or(`full_name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  logAdminQueryError("customers.list", error);
  const profiles = (data ?? []) as AdminProfileSummary[];
  if (!profiles.length) return [];

  const ids = profiles.map((profile) => profile.id);
  const [ordersResult, essaysResult, creditsResult, answersResult] = await Promise.all([
    admin.from("orders").select("user_id,amount_cents,status,paid_at,created_at").in("user_id", ids),
    admin.from("essay_submissions").select("user_id,status").in("user_id", ids),
    admin.from("credit_accounts").select("user_id,balance").in("user_id", ids),
    admin.from("user_question_answers").select("user_id").in("user_id", ids).limit(50000),
  ]);

  logAdminQueryError("customers.orders", ordersResult.error);
  logAdminQueryError("customers.essays", essaysResult.error);
  logAdminQueryError("customers.credits", creditsResult.error);
  logAdminQueryError("customers.answers", answersResult.error);

  const ordersByUser = new Map<string, { count: number; cents: number; last: string | null }>();
  for (const order of (ordersResult.data ?? []) as AdminOrder[]) {
    const entry = ordersByUser.get(order.user_id) ?? { count: 0, cents: 0, last: null };
    entry.count += 1;
    if (isRevenueOrder(order.status)) entry.cents += order.amount_cents || 0;
    if (isRefundedOrder(order.status)) entry.cents -= order.amount_cents || 0;
    const stamp = order.paid_at || order.created_at;
    if (stamp && (!entry.last || stamp > entry.last)) entry.last = stamp;
    ordersByUser.set(order.user_id, entry);
  }

  const essaysByUser = new Map<string, number>();
  for (const essay of (essaysResult.data ?? []) as { user_id: string }[]) {
    essaysByUser.set(essay.user_id, (essaysByUser.get(essay.user_id) ?? 0) + 1);
  }

  const creditsByUser = new Map<string, number>();
  for (const account of (creditsResult.data ?? []) as { user_id: string; balance: number }[]) {
    creditsByUser.set(account.user_id, account.balance ?? 0);
  }

  const answersByUser = new Map<string, number>();
  for (const answer of (answersResult.data ?? []) as { user_id: string }[]) {
    answersByUser.set(answer.user_id, (answersByUser.get(answer.user_id) ?? 0) + 1);
  }

  const now = Date.now();
  const rows: AdminCustomerRow[] = profiles.map((profile) => {
    const orderStats = ordersByUser.get(profile.id);
    return {
      ...profile,
      orders: orderStats?.count ?? 0,
      paidCents: orderStats?.cents ?? 0,
      lastOrderAt: orderStats?.last ?? null,
      essays: essaysByUser.get(profile.id) ?? 0,
      creditBalance: creditsByUser.get(profile.id) ?? 0,
      answers: answersByUser.get(profile.id) ?? 0,
    };
  });

  const filtered = rows.filter((row) => {
    if (filters.status === "expired") {
      return Boolean(row.access_expires_at && new Date(row.access_expires_at).getTime() <= now);
    }
    if (filters.status === "paying") return row.paidCents > 0;
    if (filters.status === "inactive") return row.answers === 0;
    return true;
  });

  if (filters.sort === "revenue") filtered.sort((a, b) => b.paidCents - a.paidCents);
  else if (filters.sort === "activity") filtered.sort((a, b) => b.answers - a.answers);

  return filtered;
}

export type AdminCustomerDetail = {
  profile: AdminProfileSummary & {
    target_course: string | null;
    target_university: string | null;
    target_score: number | null;
    weekly_hours: number | null;
    referral_code: string;
    beta_tester: boolean;
  };
  orders: (AdminOrder & { product_name: string | null })[];
  essays: { id: string; theme: string; status: string; submitted_at: string; completed_at: string | null }[];
  credits: { balance: number; ledger: { id: string; amount: number; reason: string; created_at: string }[] };
  activity: { sessions: number; answers: number; correct: number; simulations: number; lastActiveAt: string | null };
  feedbacks: { id: string; feedback_type: string; message: string; status: string; created_at: string }[];
  referrals: { asReferrer: number; asReferred: boolean; rewarded: number };
};

export async function getAdminCustomerDetail(userId: string): Promise<AdminCustomerDetail | null> {
  const { admin } = await requireAdmin();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  logAdminQueryError("customer.detail.profile", error);
  if (!profile) return null;

  const [ordersResult, productsResult, essaysResult, creditResult, ledgerResult, sessionsResult, answersResult, simulationsResult, feedbacksResult, referrerResult, referredResult] =
    await Promise.all([
      admin.from("orders").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      admin.from("products").select("id,product_name"),
      admin
        .from("essay_submissions")
        .select("id,theme,status,submitted_at,completed_at")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false }),
      admin.from("credit_accounts").select("balance").eq("user_id", userId).maybeSingle(),
      admin
        .from("credit_ledger")
        .select("id,amount,reason,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
      admin.from("practice_sessions").select("id").eq("user_id", userId),
      admin
        .from("user_question_answers")
        .select("id,is_correct,answered_at")
        .eq("user_id", userId)
        .order("answered_at", { ascending: false })
        .limit(5000),
      admin.from("user_simulations").select("id").eq("user_id", userId),
      admin
        .from("feedbacks")
        .select("id,feedback_type,message,status,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      admin.from("referrals").select("id,status").eq("referrer_user_id", userId),
      admin.from("referrals").select("id").eq("referred_user_id", userId).maybeSingle(),
    ]);

  const productNames = new Map(
    ((productsResult.data ?? []) as { id: string; product_name: string }[]).map((product) => [
      product.id,
      product.product_name,
    ]),
  );

  const answers = (answersResult.data ?? []) as { is_correct: boolean; answered_at: string }[];
  const referrerRows = (referrerResult.data ?? []) as { status: string }[];

  return {
    profile: profile as AdminCustomerDetail["profile"],
    orders: ((ordersResult.data ?? []) as AdminOrder[]).map((order) => ({
      ...order,
      product_name: productNames.get(order.product_id) ?? null,
    })),
    essays: (essaysResult.data ?? []) as AdminCustomerDetail["essays"],
    credits: {
      balance: (creditResult.data as { balance: number } | null)?.balance ?? 0,
      ledger: (ledgerResult.data ?? []) as AdminCustomerDetail["credits"]["ledger"],
    },
    activity: {
      sessions: (sessionsResult.data ?? []).length,
      answers: answers.length,
      correct: answers.filter((answer) => answer.is_correct).length,
      simulations: (simulationsResult.data ?? []).length,
      lastActiveAt: answers[0]?.answered_at ?? null,
    },
    feedbacks: (feedbacksResult.data ?? []) as AdminCustomerDetail["feedbacks"],
    referrals: {
      asReferrer: referrerRows.length,
      asReferred: Boolean(referredResult.data),
      rewarded: referrerRows.filter((row) => row.status === "reward_granted").length,
    },
  };
}

export type AdminPaymentRow = AdminOrder & {
  product_name: string | null;
  customer_name: string;
  customer_email: string;
  events: number;
  failedEvents: number;
};

export async function getAdminPayments(
  filters: { status?: string; provider?: string; search?: string } = {},
): Promise<{ rows: AdminPaymentRow[]; unprocessedEvents: number }> {
  const { admin } = await requireAdmin();

  let query = admin.from("orders").select("*").order("created_at", { ascending: false }).limit(1000);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.provider && filters.provider !== "all") query = query.eq("provider", filters.provider);

  const { data, error } = await query;
  logAdminQueryError("payments.orders", error);
  const orders = (data ?? []) as AdminOrder[];

  const userIds = Array.from(new Set(orders.map((order) => order.user_id)));
  const orderIds = orders.map((order) => order.id);

  const [profilesResult, productsResult, eventsResult, unprocessedResult] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("id,full_name,email").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("products").select("id,product_name"),
    orderIds.length
      ? admin.from("payment_events").select("order_id,processed,processing_error").in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
    admin.from("payment_events").select("id", { count: "exact", head: true }).eq("processed", false),
  ]);

  logAdminQueryError("payments.profiles", profilesResult.error);
  logAdminQueryError("payments.events", eventsResult.error);

  const profiles = new Map(
    ((profilesResult.data ?? []) as { id: string; full_name: string; email: string }[]).map(
      (profile) => [profile.id, profile],
    ),
  );
  const products = new Map(
    ((productsResult.data ?? []) as { id: string; product_name: string }[]).map((product) => [
      product.id,
      product.product_name,
    ]),
  );

  const eventsByOrder = new Map<string, { total: number; failed: number }>();
  for (const event of (eventsResult.data ?? []) as {
    order_id: string | null;
    processed: boolean;
    processing_error: string | null;
  }[]) {
    if (!event.order_id) continue;
    const entry = eventsByOrder.get(event.order_id) ?? { total: 0, failed: 0 };
    entry.total += 1;
    if (!event.processed || event.processing_error) entry.failed += 1;
    eventsByOrder.set(event.order_id, entry);
  }

  const search = filters.search?.trim().toLowerCase();
  const rows = orders
    .map((order) => {
      const profile = profiles.get(order.user_id);
      const events = eventsByOrder.get(order.id);
      return {
        ...order,
        product_name: products.get(order.product_id) ?? null,
        customer_name: profile?.full_name || "—",
        customer_email: profile?.email || "—",
        events: events?.total ?? 0,
        failedEvents: events?.failed ?? 0,
      };
    })
    .filter((row) => {
      if (!search) return true;
      return (
        row.customer_email.toLowerCase().includes(search) ||
        row.customer_name.toLowerCase().includes(search) ||
        (row.provider_order_id ?? "").toLowerCase().includes(search) ||
        row.id.toLowerCase().includes(search)
      );
    });

  return { rows, unprocessedEvents: unprocessedResult.count ?? 0 };
}

export type AdminBilling = {
  totals: { grossCents: number; refundedCents: number; netCents: number; orders: number };
  byMonth: { month: string; netCents: number; orders: number }[];
  byProduct: { productId: string; name: string; kind: string; orders: number; netCents: number }[];
  byStatus: { status: string; count: number; cents: number }[];
  credits: { purchased: number; granted: number; consumed: number; outstanding: number };
  topCustomers: { userId: string; name: string; email: string; cents: number; orders: number }[];
};

export async function getAdminBilling(): Promise<AdminBilling> {
  const { admin } = await requireAdmin();

  const [ordersResult, productsResult, ledgerResult, accountsResult] = await Promise.all([
    admin.from("orders").select("*").limit(20000),
    admin.from("products").select("id,product_name,product_kind"),
    admin.from("credit_ledger").select("amount,reason").limit(50000),
    admin.from("credit_accounts").select("balance").limit(20000),
  ]);

  logAdminQueryError("billing.orders", ordersResult.error);
  logAdminQueryError("billing.ledger", ledgerResult.error);

  const orders = (ordersResult.data ?? []) as AdminOrder[];
  const products = new Map(
    ((productsResult.data ?? []) as { id: string; product_name: string; product_kind: string }[]).map(
      (product) => [product.id, product],
    ),
  );

  const grossCents = orders
    .filter((order) => isRevenueOrder(order.status))
    .reduce((total, order) => total + (order.amount_cents || 0), 0);
  const refundedCents = orders
    .filter((order) => isRefundedOrder(order.status))
    .reduce((total, order) => total + (order.amount_cents || 0), 0);

  const monthMap = new Map<string, { netCents: number; orders: number }>();
  for (const order of orders) {
    const stamp = order.paid_at || order.created_at;
    if (!stamp) continue;
    if (!isRevenueOrder(order.status) && !isRefundedOrder(order.status)) continue;
    const month = stamp.slice(0, 7);
    const entry = monthMap.get(month) ?? { netCents: 0, orders: 0 };
    if (isRevenueOrder(order.status)) {
      entry.netCents += order.amount_cents || 0;
      entry.orders += 1;
    } else {
      entry.netCents -= order.amount_cents || 0;
    }
    monthMap.set(month, entry);
  }

  const productMap = new Map<string, { orders: number; netCents: number }>();
  for (const order of orders) {
    if (!isRevenueOrder(order.status) && !isRefundedOrder(order.status)) continue;
    const entry = productMap.get(order.product_id) ?? { orders: 0, netCents: 0 };
    if (isRevenueOrder(order.status)) {
      entry.orders += 1;
      entry.netCents += order.amount_cents || 0;
    } else {
      entry.netCents -= order.amount_cents || 0;
    }
    productMap.set(order.product_id, entry);
  }

  const statusMap = new Map<string, { count: number; cents: number }>();
  for (const order of orders) {
    const entry = statusMap.get(order.status) ?? { count: 0, cents: 0 };
    entry.count += 1;
    entry.cents += order.amount_cents || 0;
    statusMap.set(order.status, entry);
  }

  const customerMap = new Map<string, { cents: number; orders: number }>();
  for (const order of orders) {
    if (!isRevenueOrder(order.status)) continue;
    const entry = customerMap.get(order.user_id) ?? { cents: 0, orders: 0 };
    entry.cents += order.amount_cents || 0;
    entry.orders += 1;
    customerMap.set(order.user_id, entry);
  }

  const topIds = Array.from(customerMap.entries())
    .sort((a, b) => b[1].cents - a[1].cents)
    .slice(0, 10);
  const { data: topProfiles } = topIds.length
    ? await admin
        .from("profiles")
        .select("id,full_name,email")
        .in("id", topIds.map(([id]) => id))
    : { data: [] };
  const profileById = new Map(
    ((topProfiles ?? []) as { id: string; full_name: string; email: string }[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const ledger = (ledgerResult.data ?? []) as { amount: number; reason: string }[];

  return {
    totals: {
      grossCents,
      refundedCents,
      netCents: grossCents - refundedCents,
      orders: orders.length,
    },
    byMonth: Array.from(monthMap, ([month, value]) => ({ month, ...value })).sort((a, b) =>
      a.month.localeCompare(b.month),
    ),
    byProduct: Array.from(productMap, ([productId, value]) => ({
      productId,
      name: products.get(productId)?.product_name ?? "Produto removido",
      kind: products.get(productId)?.product_kind ?? "—",
      ...value,
    })).sort((a, b) => b.netCents - a.netCents),
    byStatus: Array.from(statusMap, ([status, value]) => ({ status, ...value })).sort(
      (a, b) => b.count - a.count,
    ),
    credits: {
      purchased: ledger
        .filter((entry) => entry.reason === "purchase")
        .reduce((total, entry) => total + entry.amount, 0),
      granted: ledger
        .filter((entry) => entry.amount > 0 && entry.reason !== "purchase")
        .reduce((total, entry) => total + entry.amount, 0),
      consumed: ledger
        .filter((entry) => entry.amount < 0)
        .reduce((total, entry) => total + Math.abs(entry.amount), 0),
      outstanding: ((accountsResult.data ?? []) as { balance: number }[]).reduce(
        (total, account) => total + (account.balance || 0),
        0,
      ),
    },
    topCustomers: topIds.map(([userId, value]) => ({
      userId,
      name: profileById.get(userId)?.full_name || "—",
      email: profileById.get(userId)?.email || "—",
      cents: value.cents,
      orders: value.orders,
    })),
  };
}

export type AdminActivity = {
  essays: {
    total: number;
    byStatus: { status: string; count: number }[];
    averageTurnaroundHours: number | null;
    oldestOpenAt: string | null;
    recent: {
      id: string;
      theme: string;
      status: string;
      submitted_at: string;
      student: string;
    }[];
  };
  practice: {
    sessions: number;
    finished: number;
    answers: number;
    accuracy: number;
    simulations: number;
    studyPlans: number;
  };
  events: { name: string; count: number }[];
  referrals: { status: string; count: number }[];
  topics: { name: string; answers: number; accuracy: number }[];
};

export async function getAdminActivity(periodDays = 30): Promise<AdminActivity> {
  const { admin } = await requireAdmin();
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

  const [essaysResult, sessionsResult, answersResult, simulationsResult, plansResult, eventsResult, referralsResult, topicsResult] =
    await Promise.all([
      admin
        .from("essay_submissions")
        .select("id,theme,status,user_id,submitted_at,completed_at")
        .order("submitted_at", { ascending: false })
        .limit(5000),
      admin.from("practice_sessions").select("id,status,started_at").gte("started_at", since).limit(20000),
      // user_question_answers não guarda topic_id: o assunto vem de questions.
      admin
        .from("user_question_answers")
        .select("id,is_correct,question_id,answered_at")
        .gte("answered_at", since)
        .limit(50000),
      admin.from("user_simulations").select("id").gte("started_at", since).limit(20000),
      admin.from("study_plans").select("id").limit(20000),
      admin.from("product_events").select("event_name").gte("created_at", since).limit(50000),
      admin.from("referrals").select("status").limit(20000),
      admin.from("topics").select("id,name").limit(5000),
    ]);

  logAdminQueryError("activity.essays", essaysResult.error);
  logAdminQueryError("activity.answers", answersResult.error);

  const essays = (essaysResult.data ?? []) as {
    id: string;
    theme: string;
    status: string;
    user_id: string;
    submitted_at: string;
    completed_at: string | null;
  }[];

  const turnarounds = essays
    .filter((essay) => essay.completed_at)
    .map(
      (essay) =>
        (new Date(essay.completed_at as string).getTime() - new Date(essay.submitted_at).getTime()) /
        3_600_000,
    )
    .filter((hours) => Number.isFinite(hours) && hours >= 0);

  const openEssays = essays
    .filter((essay) => isOpenEssay(essay.status))
    .sort((a, b) => a.submitted_at.localeCompare(b.submitted_at));

  const essayStatusMap = new Map<string, number>();
  for (const essay of essays) {
    essayStatusMap.set(essay.status, (essayStatusMap.get(essay.status) ?? 0) + 1);
  }

  const recentIds = Array.from(new Set(essays.slice(0, 12).map((essay) => essay.user_id)));
  const { data: recentProfiles } = recentIds.length
    ? await admin.from("profiles").select("id,full_name,email").in("id", recentIds)
    : { data: [] };
  const profileById = new Map(
    ((recentProfiles ?? []) as { id: string; full_name: string; email: string }[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  const answers = (answersResult.data ?? []) as {
    is_correct: boolean;
    question_id: string;
  }[];
  const correct = answers.filter((answer) => answer.is_correct).length;

  const topicNames = new Map(
    ((topicsResult.data ?? []) as { id: string; name: string }[]).map((topic) => [
      topic.id,
      topic.name,
    ]),
  );

  // Uma consulta só pelas questões respondidas no período resolve o assunto de
  // todas as respostas — bem menos linhas que o volume de respostas.
  const answeredQuestionIds = Array.from(new Set(answers.map((answer) => answer.question_id)));
  const questionTopics = new Map<string, string>();
  for (let start = 0; start < answeredQuestionIds.length; start += 500) {
    const chunk = answeredQuestionIds.slice(start, start + 500);
    const { data: questionRows, error: questionsError } = await admin
      .from("questions")
      .select("id,topic_id")
      .in("id", chunk);
    logAdminQueryError("activity.questions", questionsError);
    for (const question of (questionRows ?? []) as { id: string; topic_id: string | null }[]) {
      if (question.topic_id) questionTopics.set(question.id, question.topic_id);
    }
  }

  const topicMap = new Map<string, { answers: number; correct: number }>();
  for (const answer of answers) {
    const topicId = questionTopics.get(answer.question_id);
    if (!topicId) continue;
    const entry = topicMap.get(topicId) ?? { answers: 0, correct: 0 };
    entry.answers += 1;
    if (answer.is_correct) entry.correct += 1;
    topicMap.set(topicId, entry);
  }

  const eventMap = new Map<string, number>();
  for (const event of (eventsResult.data ?? []) as { event_name: string }[]) {
    eventMap.set(event.event_name, (eventMap.get(event.event_name) ?? 0) + 1);
  }

  const referralMap = new Map<string, number>();
  for (const referral of (referralsResult.data ?? []) as { status: string }[]) {
    referralMap.set(referral.status, (referralMap.get(referral.status) ?? 0) + 1);
  }

  const sessions = (sessionsResult.data ?? []) as { status: string }[];

  return {
    essays: {
      total: essays.length,
      byStatus: Array.from(essayStatusMap, ([status, count]) => ({ status, count })).sort(
        (a, b) => b.count - a.count,
      ),
      averageTurnaroundHours: turnarounds.length
        ? Math.round((turnarounds.reduce((sum, hours) => sum + hours, 0) / turnarounds.length) * 10) /
          10
        : null,
      oldestOpenAt: openEssays[0]?.submitted_at ?? null,
      recent: essays.slice(0, 12).map((essay) => ({
        id: essay.id,
        theme: essay.theme,
        status: essay.status,
        submitted_at: essay.submitted_at,
        student: profileById.get(essay.user_id)?.full_name || profileById.get(essay.user_id)?.email || "—",
      })),
    },
    practice: {
      sessions: sessions.length,
      finished: sessions.filter((session) => session.status === "Finalizado").length,
      answers: answers.length,
      accuracy: answers.length ? Math.round((correct / answers.length) * 1000) / 10 : 0,
      simulations: (simulationsResult.data ?? []).length,
      studyPlans: (plansResult.data ?? []).length,
    },
    events: Array.from(eventMap, ([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
    referrals: Array.from(referralMap, ([status, count]) => ({ status, count })).sort(
      (a, b) => b.count - a.count,
    ),
    topics: Array.from(topicMap, ([topicId, value]) => ({
      name: topicNames.get(topicId) ?? "Assunto sem nome",
      answers: value.answers,
      accuracy: value.answers ? Math.round((value.correct / value.answers) * 1000) / 10 : 0,
    }))
      .sort((a, b) => b.answers - a.answers)
      .slice(0, 12),
  };
}
