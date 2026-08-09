import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { PatientListView } from "@/components/shared/PatientListView"

export const dynamic = 'force-dynamic'

export default async function PatientListPage({
  searchParams,
}: {
  searchParams?: { search?: string }
}) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const [{ data: patients, error }, { data: userResult }] = await Promise.all([
    supabase
      .from('patients')
      .select(`
        id, 
        mrn, 
        demographics,
        created_at,
        hospitals(name),
        predictions(severity, probability, disease, created_at)
      `)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase.auth.getUser()
  ])

  const profile = userResult?.user
    ? await supabase.from('profiles').select('role').eq('id', userResult.user.id).single()
    : { data: null }

  const isAdmin = Boolean(profile.data && ['super_admin', 'hospital_admin', 'data_scientist'].includes(profile.data.role))

  if (error) {
    console.error("Supabase Error fetching patients:", error)
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
        <h2 className="font-bold">Error loading patients</h2>
        <p className="text-sm">{error.message}</p>
      </div>
    )
  }

  return <PatientListView patients={patients || []} initialSearch={searchParams?.search || ""} isAdmin={isAdmin} />
}

