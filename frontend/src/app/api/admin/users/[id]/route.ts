import { NextResponse } from "next/server"
import { requireSuperAdmin, createAdminClient } from "@/lib/supabase/admin"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => ({}))
  const { email, full_name, phone, specialty, hospital_id, department, role, ...rest } = body

  const admin = createAdminClient()

  // Email lives on auth.users, not public.profiles — update it there first
  // via the Admin API so login credentials stay in sync with the profile.
  if (email) {
    const { error: authError } = await admin.auth.admin.updateUserById(params.id, { email })
    if (authError) {
      return NextResponse.json({ error: `Failed to update email: ${authError.message}` }, { status: 400 })
    }
  }

  const profileUpdates: Record<string, any> = { ...rest }
  if (email !== undefined) profileUpdates.email = email
  if (full_name !== undefined) profileUpdates.full_name = full_name
  if (phone !== undefined) profileUpdates.phone = phone
  if (specialty !== undefined) profileUpdates.specialty = specialty
  if (hospital_id !== undefined) profileUpdates.hospital_id = hospital_id
  if (department !== undefined) profileUpdates.department = department
  // Role changes go through the same admin client so the
  // prevent_self_role_escalation trigger (which only blocks the *acting*
  // user's own row) doesn't interfere with a genuine admin action.
  if (role !== undefined) profileUpdates.role = role

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await admin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", params.id)
    if (profileError) {
      return NextResponse.json({ error: `Failed to update profile: ${profileError.message}` }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireSuperAdmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  if (params.id === auth.userId) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 })
  }

  const admin = createAdminClient()
  // Deleting the auth.users row cascades to public.profiles (and everything
  // referencing it) via the ON DELETE CASCADE foreign key set up in the
  // original schema — no separate profile delete needed.
  const { error } = await admin.auth.admin.deleteUser(params.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
