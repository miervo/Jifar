import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/AdminDashboard";
import { getAdminSessionFromCookies } from "@/lib/server/auth";
import { logServerError } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Кто идёт к Лене",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  let csrfToken: string | null = null;
  try {
    const session = await getAdminSessionFromCookies();
    csrfToken = session?.csrfToken ?? null;
  } catch (error) {
    logServerError("admin.page", error);
  }
  // Без действующей сессии страница не рендерится вовсе.
  if (!csrfToken) redirect("/");

  return (
    <div className="admin-page">
      <AdminDashboard csrfToken={csrfToken} />
    </div>
  );
}
