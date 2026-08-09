"use client"
import { useState } from "react"
import { AvatarUploader } from "./AvatarUploader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createBrowserClient } from "@supabase/ssr"
import { CheckCircle2, Mail, Shield, Building2, Phone, Stethoscope } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Admin",
  hospital_admin: "Hospital Admin",
  doctor: "Doctor",
  nurse: "Nurse",
  data_scientist: "Data Scientist",
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-500/20",
  hospital_admin: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  doctor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  nurse: "bg-green-500/10 text-green-600 border-green-500/20",
  data_scientist: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

const SPECIALTIES = [
  "General Practice", "Cardiology", "Endocrinology", "Nephrology",
  "Neurology", "Oncology", "Pulmonology", "Internal Medicine",
  "Emergency Medicine", "Radiology", "Pathology", "Data Science"
]

export function ProfileForm({ user, profile, hospitals }: {
  user: any
  profile: any
  hospitals?: any[]
}) {
  const [fullName, setFullName] = useState(profile?.full_name || "")
  const [department, setDepartment] = useState(profile?.department || "")
  const [specialty, setSpecialty] = useState(profile?.specialty || "")
  const [phone, setPhone] = useState(profile?.phone || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [consultationFee, setConsultationFee] = useState(profile?.consultation_fee ? String(profile.consultation_fee) : "")
  const [servicesString, setServicesString] = useState(Array.isArray(profile?.services) ? profile.services.join(", ") : "")
  const [available, setAvailable] = useState(profile?.available ?? true)

  const [hospitalId, setHospitalId] = useState(profile?.hospital_id || "")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          department,
          specialty,
          phone,
          bio,
          available,
          consultation_fee: consultationFee ? Number(consultationFee) : null,
          services: servicesString.split(',').map((item) => item.trim()).filter(Boolean),
          hospital_id: (hospitalId && hospitalId !== 'none') ? hospitalId : null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id)

      if (error) throw error
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const initials = fullName
    ? fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "?"

  return (
    <div className="space-y-8">
      {/* Profile preview header */}
      <div className="flex items-center gap-5 pb-6 border-b">
        <AvatarUploader uid={user.id} url={avatarUrl} onUpload={(url) => setAvatarUrl(url)} />
        <div>
          <h2 className="text-xl font-bold">{fullName || "Your Name"}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className={`border text-xs ${ROLE_COLORS[profile?.role] || "bg-muted text-muted-foreground"}`}>
              <Shield className="h-2.5 w-2.5 mr-1" />
              {ROLE_LABELS[profile?.role] || profile?.role || "No Role"}
            </Badge>
            {specialty && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Stethoscope className="h-3 w-3" /> {specialty}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Mail className="h-3 w-3" /> {user.email}
          </p>
        </div>
      </div>

      {/* Read-only account info */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Account Info</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Email Address</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              {user.email}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">System Role</Label>
            <div className="flex items-center gap-2 h-9 px-3 rounded-md border bg-muted/40 text-sm text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              {ROLE_LABELS[profile?.role] || profile?.role || "Unassigned"}
              <span className="text-xs text-muted-foreground/60 ml-1">(managed by admin)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personal info fields */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Personal Details</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Dr. John Smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="h-3.5 w-3.5 inline mr-1" /> Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+92 300 1234567"
            />
            <p className="text-xs text-muted-foreground">Format example: +92 300 1234567</p>
          </div>
        </div>
      </div>

      {/* Clinical info fields */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Clinical Information</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="specialty">
              <Stethoscope className="h-3.5 w-3.5 inline mr-1" /> Specialty
            </Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger id="specialty">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="department">
              <Building2 className="h-3.5 w-3.5 inline mr-1" /> Department
            </Label>
            <Input
              id="department"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              placeholder="e.g. Cardiology Ward B"
            />
          </div>
          {hospitals && hospitals.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="hospital">Hospital Assignment</Label>
              <Select value={hospitalId} onValueChange={setHospitalId}>
                <SelectTrigger id="hospital">
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {hospitals.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Doctor Profile</h3>
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <input
                id="available"
                type="checkbox"
                checked={available}
                onChange={(event) => setAvailable(event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="available">Accepting new patient referrals</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="consultationFee">Consultation Fee</Label>
              <Input
                id="consultationFee"
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                placeholder="e.g. 150"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services">Services / Specialties</Label>
              <Input
                id="services"
                value={servicesString}
                onChange={(e) => setServicesString(e.target.value)}
                placeholder="e.g. Diabetes care, Hypertension follow-up"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Profile Summary</Label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="min-h-[120px] w-full rounded-md border border-input bg-input px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Describe your specialties, clinical philosophy, and experience."
              />
            </div>
          </div>
        </div>
      </div>



      {/* Footer */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" /> Profile updated!
          </span>
        )}
      </div>
    </div>
  )
}
