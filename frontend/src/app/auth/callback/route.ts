import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const token_hash = requestUrl.searchParams.get("token_hash")
  const type = requestUrl.searchParams.get("type")
  const explicitNext = requestUrl.searchParams.get("next")

  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options })
        },
      },
    }
  )

  // Once a session exists, work out where this user actually belongs —
  // an explicit `next` (e.g. the doctor-registration completion page for a
  // new OAuth signup) wins; otherwise route by role/status so a patient
  // never briefly lands on the doctor dashboard shell or vice versa.
  const resolveDestination = async () => {
    if (explicitNext) return explicitNext

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return "/login"

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (!profile) return "/onboarding"
    if (profile.role === "patient") return "/patient/dashboard"

    const doctorRoles = ["doctor", "super_admin", "hospital_admin", "nurse", "data_scientist"]
    if (doctorRoles.includes(profile.role)) {
      if (profile.role === "doctor") {
        const { data: doctor } = await supabase.from("doctors").select("status").eq("user_id", user.id).single()
        if (doctor?.status !== "approved") return "/pending-approval"
      }
      return "/dashboard"
    }
    return "/dashboard"
  }

  // Handle PKCE code exchange (signup confirmation, magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const dest = await resolveDestination()
      return NextResponse.redirect(new URL(dest, requestUrl.origin))
    }
  }

  // Handle token_hash (email confirmation OTP flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any })
    if (!error) {
      const dest = await resolveDestination()
      return NextResponse.redirect(new URL(dest, requestUrl.origin))
    }
  }

  // Auth failed — redirect to login with error message
  return NextResponse.redirect(
    new URL("/login?error=Could+not+confirm+your+account.+Please+try+again.", requestUrl.origin)
  )
}
