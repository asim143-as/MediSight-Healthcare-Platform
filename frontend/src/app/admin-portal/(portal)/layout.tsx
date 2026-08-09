import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AdminPortalSidebar } from "@/components/shared/AdminPortalSidebar"

export const dynamic = "force-dynamic"

export default async function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/admin-portal/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") {
    redirect("/admin-portal/login")
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AdminPortalSidebar adminName={profile.full_name} />
      <main className="flex-1 overflow-auto p-6 lg:p-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
