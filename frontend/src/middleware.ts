import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if route is related to auth
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || 
                      request.nextUrl.pathname.startsWith('/signup') || 
                      request.nextUrl.pathname.startsWith('/forgot-password') ||
                      request.nextUrl.pathname.startsWith('/update-password') ||
                      request.nextUrl.pathname.startsWith('/auth/callback')

  // Public marketing page - accessible whether logged in or not.
  // "/" always renders the Welcome page (it redirects there), so it must stay public too.
  const isPublicRoute = request.nextUrl.pathname.startsWith('/welcome') ||
                        request.nextUrl.pathname === '/'

  const isOnboardingRoute = request.nextUrl.pathname.startsWith('/onboarding')

  // The admin portal is a fully separate area with its own login page and
  // its own server-side role check in admin-portal/(portal)/layout.tsx.
  // It must never be swept into the doctor/patient role-routing below.
  const isAdminPortalLogin = request.nextUrl.pathname.startsWith('/admin-portal/login')
  const isAdminPortalArea = request.nextUrl.pathname.startsWith('/admin-portal')

  if (isAdminPortalArea) {
    // Let the admin-portal's own layout (and login page) handle auth/role
    // checks entirely — just make sure unauthenticated visitors land on
    // the admin login page instead of the doctor/patient one.
    if (!user && !isAdminPortalLogin) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin-portal/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based access control: patients get their own portal under /patient/*,
  // clinical staff (doctor/nurse/hospital_admin/super_admin/data_scientist) use
  // the existing /dashboard/* clinical workspace. Neither can reach the other's area.
  let role: string | null = null
  let doctorStatus: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null

    if (role === 'doctor') {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('status')
        .eq('user_id', user.id)
        .single()
      doctorStatus = doctor?.status ?? null
    }
  }

  const homeForRole = (r: string | null) => {
    if (r === 'patient') return '/patient/dashboard'
    if (r === 'doctor' && doctorStatus !== 'approved') return '/pending-approval'
    return '/dashboard'
  }

  const isPatientArea = request.nextUrl.pathname === '/patient' || request.nextUrl.pathname.startsWith('/patient/')
  const isClinicalArea =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/patients') ||
    request.nextUrl.pathname.startsWith('/appointments') ||
    request.nextUrl.pathname.startsWith('/doctors') ||
    request.nextUrl.pathname.startsWith('/alerts') ||
    request.nextUrl.pathname.startsWith('/analytics') ||
    request.nextUrl.pathname.startsWith('/assistant') ||
    request.nextUrl.pathname.startsWith('/predict') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/admin')

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = homeForRole(role)
    return NextResponse.redirect(url)
  }

  if (user && role === 'patient' && isClinicalArea) {
    const url = request.nextUrl.clone()
    url.pathname = '/patient/dashboard'
    url.searchParams.set('error', 'This area is for doctors only.')
    return NextResponse.redirect(url)
  }

  if (user && role && role !== 'patient' && isPatientArea) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.searchParams.set('error', 'This area is for patients only.')
    return NextResponse.redirect(url)
  }

  // An unapproved doctor account must never reach the clinical workspace,
  // even if they type/bookmark a /dashboard URL directly.
  if (user && role === 'doctor' && doctorStatus !== 'approved' && isClinicalArea) {
    const url = request.nextUrl.clone()
    url.pathname = '/pending-approval'
    return NextResponse.redirect(url)
  }

  if (user && !role && !isOnboardingRoute && (isClinicalArea || isPatientArea)) {
    // Authenticated but profile row not resolved yet (e.g. brand-new OAuth
    // signup, trigger hasn't finished) — send them to finish setup instead
    // of letting them fall through to a role-gated area with no role.
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
