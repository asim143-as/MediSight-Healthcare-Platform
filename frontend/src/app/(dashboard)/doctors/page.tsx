import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { DoctorListView } from "@/components/shared/DoctorListView"

export const dynamic = 'force-dynamic'

const sampleDoctors = [
  {
    id: "sample-doctor-1",
    full_name: "Dr. Mira Shah",
    specialty: "Cardiology",
    phone: "+1 (415) 555-0123",
    email: "mira.shah@medisight.ai",
    department: "Heart & Vascular",
    hospitals: { name: "MediSight Central" },
    available: true,
    consultation_fee: 175,
    bio: "Expert in heart disease management and preventive care for high-risk populations.",
    services: ["Cardiac risk assessment", "Hypertension management", "Telehealth follow up"]
  },
  {
    id: "sample-doctor-2",
    full_name: "Dr. Samuel Ortega",
    specialty: "Endocrinology",
    phone: "+1 (619) 555-0188",
    email: "samuel.ortega@medisight.ai",
    department: "Endocrinology",
    hospitals: { name: "MediSight East Campus" },
    available: true,
    consultation_fee: 145,
    bio: "Specializes in diabetes, metabolic health, and endocrine-driven chronic care plans.",
    services: ["Diabetes coaching", "Hormone care", "Lab-informed treatment"]
  },
  {
    id: "sample-doctor-3",
    full_name: "Dr. Priya Nair",
    specialty: "Nephrology",
    phone: "+1 (628) 555-0147",
    email: "priya.nair@medisight.ai",
    department: "Kidney Care",
    hospitals: { name: "MediSight North" },
    available: false,
    consultation_fee: 160,
    bio: "Focused on early kidney disease detection, prevention and coordinated patient follow-up.",
    services: ["Kidney risk review", "Lab result interpretation", "Remote monitoring"]
  }
]

export default async function DoctorsPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: doctors, error } = await supabase
    .from('profiles')
    .select('id, full_name, specialty, phone, email, department, hospital_id, hospitals(name), avatar_url, bio, available, consultation_fee, services')
    .eq('role', 'doctor')
    .order('full_name', { ascending: true })

  if (error) {
    console.error('Error loading doctors:', error)
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
        <h2 className="font-bold">Error loading doctor directory</h2>
        <p className="text-sm">{error.message}</p>
      </div>
    )
  }

  const normalizedDoctors = (doctors || []).map((doctor: any) => ({
    ...doctor,
    name: doctor.full_name,
  }))

  // Show real doctors only; if none exist, display a friendly message
  if (normalizedDoctors.length === 0) {
    return (
      <div className="rounded-xl border border-muted/20 bg-muted/10 p-6 text-muted-foreground">
        <h2 className="font-bold">No doctors found</h2>
        <p className="text-sm">The directory is currently empty. Please add doctor profiles.</p>
      </div>
    )
  }

  return <DoctorListView doctors={normalizedDoctors} />
}
