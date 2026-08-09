import { createServerClient } from "@supabase/ssr"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

/**
 * Verifies the currently logged-in user (from cookies) is a super_admin.
 * Returns { authorized: true, userId } or { authorized: false, status, message }.
 * Always call this FIRST in any /api/admin/* route before touching the
 * service-role client below.
 */
export async function requireSuperAdmin() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { authorized: false as const, status: 401, message: "Not signed in." }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "super_admin") {
    return { authorized: false as const, status: 403, message: "Admin access required." }
  }

  return { authorized: true as const, userId: user.id }
}

/**
 * A privileged Supabase client authenticated with the service_role key.
 * NEVER expose this client or the key to the browser — it bypasses RLS
 * entirely and can manage auth.users directly. Only ever import/use this
 * inside API routes, after requireSuperAdmin() has confirmed the caller
 * is an authorized admin.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.")
  }
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
