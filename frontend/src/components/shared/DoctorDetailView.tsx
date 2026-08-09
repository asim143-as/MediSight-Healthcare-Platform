"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, MapPin, Phone, Mail, CheckCircle2 } from "lucide-react"

interface DoctorDetailViewProps {
  doctor: any
}

export function DoctorDetailView({ doctor }: DoctorDetailViewProps) {
  const displayName = doctor.first_name && doctor.last_name
    ? `${doctor.first_name} ${doctor.last_name}`
    : (doctor.full_name || doctor.name || 'Doctor')
  const status = doctor.availability_status || (doctor.available ? 'available' : 'busy')
  const statusMap: Record<string, { label: string; className: string }> = {
    available: { label: 'Accepting Patients', className: 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' },
    busy:      { label: 'Currently Busy',     className: 'bg-amber-500/10 text-amber-700 border border-amber-500/20' },
    on_leave:  { label: 'On Leave',           className: 'bg-slate-500/10 text-slate-600 border border-slate-500/20' },
  }
  const statusInfo = statusMap[status] || statusMap['busy']

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{doctor.specialty} • {doctor.hospitals?.name || "Independent"}</p>
        </div>
        <Link href="/doctors">
          <Button variant="outline" className="h-10">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to doctors
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Doctor Profile</CardTitle>
            <CardDescription>Contact details and availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 pb-4 border-b">
              <img
                src={doctor.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1d4ed8&color=fff&size=128&rounded=true`}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover border-2 border-primary/20 shadow-md"
              />
              <div className="text-center">
                <p className="font-semibold text-base">{displayName}</p>
                <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {doctor.hospitals?.name || "Independent"}
              </div>
              {(doctor.contact_number || doctor.phone) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {doctor.contact_number || doctor.phone}
                </div>
              )}
              {doctor.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {doctor.email}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</span>
              <div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusInfo.className}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Consultation Fee</span>
              <div className="text-lg font-semibold">{doctor.consultation_fee ? `Rs. ${Number(doctor.consultation_fee).toLocaleString()}` : "TBD"}</div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About {displayName}</CardTitle>
              <CardDescription>Specialty, services, and practice summary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{doctor.bio || "No biography added yet."}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border p-4 bg-muted/50">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Services</p>
                  <div className="space-y-2 text-sm">
                    {Array.isArray(doctor.services) && doctor.services.length > 0 ? (
                      doctor.services.map((service: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span>{service}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No services or specialties added yet.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border p-4 bg-muted/50">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">Availability</p>
                  <p className="text-sm leading-6 text-muted-foreground">{doctor.available ? "Available for new consultations and follow-ups." : "Currently unavailable."}</p>
              {doctor.bio && <p className="text-sm leading-6 text-muted-foreground mt-2">{doctor.bio}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
