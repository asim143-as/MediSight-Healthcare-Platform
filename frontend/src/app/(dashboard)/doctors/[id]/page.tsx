import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { notFound } from "next/navigation"
import { DoctorDetailView } from "@/components/shared/DoctorDetailView"

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

export default async function DoctorDetailPage({ params }: { params: { id: string } }) {
  if (!params?.id) return notFound()

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )

  const { data: doctor, error } = await supabase
    .from('profiles')
    .select('id, full_name, specialty, phone, email, department, hospital_id, hospitals(name), avatar_url, bio, available, consultation_fee, services')
    .eq('id', params.id)
    .single()

  if (error) {
    console.error('Doctor profile error:', error)
  }

  const selectedDoctor = doctor || sampleDoctors.find((item) => item.id === params.id)
  if (!selectedDoctor) return notFound()

  return <DoctorDetailView doctor={{ ...selectedDoctor, name: selectedDoctor.full_name }} />
}
