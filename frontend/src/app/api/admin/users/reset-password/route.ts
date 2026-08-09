import { NextResponse } from "next/server"
import { requireSuperAdmin, createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { userId, newPassword } = await request.json().catch(() => ({}))

  if (!userId || !newPassword) {
    return NextResponse.json({ error: "userId and newPassword are required." }, { status: 400 })
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
