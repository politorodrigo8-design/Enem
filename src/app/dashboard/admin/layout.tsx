import { requireAdmin } from "@/lib/admin/guard";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";

/**
 * O guard mora no layout: qualquer rota abaixo de /dashboard/admin passa por
 * aqui antes de renderizar, então nenhuma página nova pode nascer desprotegida
 * por esquecimento.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div>
      <AdminNav />
      {children}
    </div>
  );
}
