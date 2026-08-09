"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  Stethoscope,
  Star,
  Phone,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

/* ------------------------------------------------------------------ */
/*  Static config                                                      */
/* ------------------------------------------------------------------ */

const STEPS = ["Select Symptoms", "Patient Details", "AI Prediction", "Book Doctor"]

function formatSymptomLabel(id: string) {
  return id
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

type PatientDetails = {
  name: string
  age: string
  gender: string
  weight: string
  height: string
  bloodGroup: string
  phone: string
  email: string
}

type PredictionResult = {
  disease: string
  specialty: string
  confidence: number
  risk: "Low" | "Moderate" | "High" | "Critical"
  recommendations: string[]
  alternatives?: { disease: string; confidence: number }[]
}

type Doctor = {
  id: string
  full_name: string
  specialty: string
  avatar_url?: string | null
  bio?: string | null
  consultation_fee?: number | null
  available?: boolean | null
  phone?: string | null
  hospitals?: { name: string } | null
}

const RISK_STYLES: Record<string, string> = {
  Low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  Moderate: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  High: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  Critical: "bg-red-500/10 text-red-600 border-red-500/30",
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function PredictPage() {
  const [step, setStep] = useState(0)
  const [allSymptoms, setAllSymptoms] = useState<string[]>([])
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(new Set())
  const [symptomSearch, setSymptomSearch] = useState("")
  const [patient, setPatient] = useState<PatientDetails>({
    name: "", age: "", gender: "", weight: "", height: "", bloodGroup: "", phone: "", email: "",
  })
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [isPredicting, setIsPredicting] = useState(false)
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetch("/api/predict-symptoms")
      .then((r) => r.json())
      .then((data) => setAllSymptoms(data.symptoms || []))
      .catch(() => setAllSymptoms([]))
  }, [])

  const filteredSymptoms = useMemo(() => {
    const q = symptomSearch.trim().toLowerCase()
    if (!q) return allSymptoms
    return allSymptoms.filter((s) => formatSymptomLabel(s).toLowerCase().includes(q))
  }, [allSymptoms, symptomSearch])

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1))
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const runPrediction = async () => {
    setIsPredicting(true)
    setError(null)
    try {
      const res = await fetch("/api/predict-symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptoms: Array.from(selectedSymptoms) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Prediction failed.")
      setResult(data)
      goNext()
    } catch (e: any) {
      setError(e.message || "Something went wrong while predicting.")
    } finally {
      setIsPredicting(false)
    }
  }

  const loadDoctors = async (specialty: string) => {
    setIsLoadingDoctors(true)
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, specialty, avatar_url, bio, consultation_fee, available, phone, hospitals(name)")
      .eq("role", "doctor")
      .ilike("specialty", `%${specialty.split(" ")[0]}%`)
      .limit(6)
    setDoctors((data as any) || [])
    setIsLoadingDoctors(false)
  }

  useEffect(() => {
    if (step === 3 && result) {
      loadDoctors(result.specialty)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result])

  const resetWizard = () => {
    setStep(0)
    setSelectedSymptoms(new Set())
    setPatient({ name: "", age: "", gender: "", weight: "", height: "", bloodGroup: "", phone: "", email: "" })
    setResult(null)
    setDoctors([])
    setError(null)
  }

  const downloadReport = () => window.print()

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16 print:max-w-full">
      <div className="print:hidden">
        <p className="kicker mb-3">AI-Powered Screening</p>
        <h1 className="font-heading text-3xl font-bold">Disease Prediction Wizard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Answer a few questions and get an instant AI-assisted risk screening, plus a matched specialist.
        </p>
      </div>

      {/* Progress bar */}
      <div className="print:hidden">
        <div className="flex items-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                    i < step
                      ? "border-primary bg-primary text-white"
                      : i === step
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {i < step ? <CheckCircle2 className="h-4.5 w-4.5" /> : i + 1}
                </div>
                <span className={`hidden text-xs font-medium sm:block ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 flex-1 rounded ${i < step ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ---------------- Step 1: Symptoms ---------------- */}
        {step === 0 && (
          <motion.div key="symptoms" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold">Select Symptoms</h2>
            <p className="mt-1 text-sm text-muted-foreground">Choose everything you're currently experiencing.</p>

            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={symptomSearch}
                onChange={(e) => setSymptomSearch(e.target.value)}
                placeholder="Search symptoms..."
                className="pl-9"
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredSymptoms.map((s) => (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                    selectedSymptoms.has(s)
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSymptoms.has(s)}
                    onChange={() => toggleSymptom(s)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  {formatSymptomLabel(s)}
                </label>
              ))}
              {allSymptoms.length === 0 && (
                <p className="col-span-full text-sm text-muted-foreground">Loading symptoms...</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{selectedSymptoms.size} selected</span>
              <Button variant="gradient" onClick={goNext} disabled={selectedSymptoms.size === 0}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ---------------- Step 2: Patient Details ---------------- */}
        {step === 1 && (
          <motion.div key="details" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-heading text-lg font-bold">Patient Details</h2>
            <p className="mt-1 text-sm text-muted-foreground">These help personalize your recommendations.</p>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Age</Label>
                <Input type="number" value={patient.age} onChange={(e) => setPatient({ ...patient, age: e.target.value })} placeholder="32" />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <select
                  value={patient.gender}
                  onChange={(e) => setPatient({ ...patient, gender: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Blood Group</Label>
                <select
                  value={patient.bloodGroup}
                  onChange={(e) => setPatient({ ...patient, bloodGroup: e.target.value })}
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Select</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Weight (kg)</Label>
                <Input type="number" value={patient.weight} onChange={(e) => setPatient({ ...patient, weight: e.target.value })} placeholder="68" />
              </div>
              <div className="space-y-1.5">
                <Label>Height (cm)</Label>
                <Input type="number" value={patient.height} onChange={(e) => setPatient({ ...patient, height: e.target.value })} placeholder="170" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={patient.phone} onChange={(e) => setPatient({ ...patient, phone: e.target.value })} placeholder="+92 3xx xxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={patient.email} onChange={(e) => setPatient({ ...patient, email: e.target.value })} placeholder="jane@example.com" />
              </div>
            </div>

            {error && (
              <div className="mt-5 flex items-center gap-2 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={goBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button>
              <Button variant="gradient" onClick={runPrediction} disabled={isPredicting || !patient.name || !patient.age}>
                {isPredicting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Predicting...</> : <>Predict Disease <ArrowRight className="ml-1.5 h-4 w-4" /></>}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ---------------- Step 3: AI Prediction Result ---------------- */}
        {step === 2 && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
            <div id="report" className="rounded-2xl border border-border bg-card p-7 shadow-premium">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="kicker mb-3">AI Screening Result</p>
                  <h2 className="font-heading text-2xl font-bold">{result.disease}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">for {patient.name}, {patient.age} yrs</p>
                </div>
                <span className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${RISK_STYLES[result.risk]}`}>
                  {result.risk} Risk
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-secondary/50 p-4">
                  <div className="text-xs font-medium text-muted-foreground">Confidence Score</div>
                  <div className="mt-1 font-heading text-3xl font-extrabold gradient-text">{result.confidence}%</div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-gradient-brand" style={{ width: `${result.confidence}%` }} />
                  </div>
                </div>
                <div className="rounded-xl bg-secondary/50 p-4">
                  <div className="text-xs font-medium text-muted-foreground">Suggested Specialist</div>
                  <div className="mt-1.5 flex items-center gap-2 font-heading text-lg font-bold">
                    <Stethoscope className="h-5 w-5 text-primary" /> {result.specialty}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold">Recommendations</h3>
                <ul className="mt-2 space-y-2">
                  {result.recommendations.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {r}
                    </li>
                  ))}
                </ul>
              </div>

              {result.alternatives && result.alternatives.length > 0 && (
                <div className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
                  Other possibilities considered: {result.alternatives.map((a) => `${a.disease} (${a.confidence}%)`).join(", ")}
                </div>
              )}

              <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-400">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                This is an AI-assisted screening tool, not a medical diagnosis. Please consult a licensed doctor to confirm any results.
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
              <Button variant="outline" onClick={resetWizard}><RotateCcw className="mr-1.5 h-4 w-4" /> Predict Again</Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={downloadReport}><Download className="mr-1.5 h-4 w-4" /> Download Report</Button>
                <Button variant="gradient" onClick={goNext}>Find a Doctor <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ---------------- Step 4: Doctor Suggestion ---------------- */}
        {step === 3 && (
          <motion.div key="doctors" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5 print:hidden">
            <div>
              <h2 className="font-heading text-lg font-bold">
                Recommended {result?.specialty}s {result && <span className="text-muted-foreground font-normal">for {result.disease}</span>}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Doctors matched to your predicted condition.</p>
            </div>

            {isLoadingDoctors ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Finding doctors...</div>
            ) : doctors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No matching specialists found right now. <Link href="/doctors" className="text-primary hover:underline">Browse all doctors</Link> instead.
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {doctors.map((doc) => (
                  <div key={doc.id} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-premium">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-secondary">
                      {doc.avatar_url ? (
                        <Image src={doc.avatar_url} alt={doc.full_name} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-sm font-bold text-white">
                          {doc.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-heading text-sm font-bold">{doc.full_name}</h3>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${doc.available ? "bg-emerald-500" : "bg-muted-foreground/40"}`} title={doc.available ? "Available" : "Unavailable"} />
                      </div>
                      <p className="text-xs text-primary">{doc.specialty}</p>
                      {doc.hospitals?.name && <p className="mt-0.5 text-xs text-muted-foreground">{doc.hospitals.name}</p>}
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-500">
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
                      </div>
                      {doc.bio && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{doc.bio}</p>}
                      <div className="mt-3 flex items-center justify-between">
                        {doc.consultation_fee ? <span className="text-xs font-semibold">${doc.consultation_fee}</span> : <span />}
                        <div className="flex gap-2">
                          <Link href={`/doctors/${doc.id}`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:bg-muted">
                            View Profile
                          </Link>
                          <Link href={`/doctors/${doc.id}`} className="btn-premium rounded-lg px-3 py-1.5 text-xs font-medium text-white">
                            Book
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={goBack}><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Result</Button>
              <Button variant="outline" onClick={resetWizard}><RotateCcw className="mr-1.5 h-4 w-4" /> Start Over</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
