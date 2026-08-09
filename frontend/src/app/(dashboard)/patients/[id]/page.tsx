import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { PatientDetailView } from "@/components/shared/PatientDetailView"

export const dynamic = 'force-dynamic'

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  if (!params || !params.id) return notFound()

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: patient } = await supabase
    .from('patients')
    .select(`
      *,
      vitals(*),
      lab_results(*),
      predictions(*)
    `)
    .eq('id', params.id)
    .single()

  if (!patient) return notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = Boolean(profile && ['super_admin', 'hospital_admin', 'data_scientist'].includes(profile.role))

  // Get the latest prediction
  const latestPrediction = patient.predictions?.sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

  return (
    <PatientDetailView 
      patient={patient} 
      latestPrediction={latestPrediction} 
      isAdmin={isAdmin}
    />
  )
}

