"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowLeft, HeartPulse, Stethoscope, TestTube2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function NewPatientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    bmi: "25",
    bpSystolic: "120",
    highChol: false,
    smoker: false,
    historyHeartDisease: false,
    historyStroke: false,
    physActivity: true,
    genHlth: "3",
    labs: [
      { testName: "", value: "", unit: "", recordedAt: new Date().toISOString().slice(0, 10) }
    ]
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Authentication required")

      const { data: profile } = await supabase
        .from("profiles")
        .select("hospital_id")
        .eq("id", user.id)
        .single()

      // Resolve hospital_id — fallback to first available hospital if doctor has none set
      let resolvedHospitalId = profile?.hospital_id || null
      if (!resolvedHospitalId) {
        const { data: firstHospital } = await supabase
          .from("hospitals")
          .select("id")
          .limit(1)
          .single()
        resolvedHospitalId = firstHospital?.id || null
      }
      if (!resolvedHospitalId) throw new Error("No hospital found. Please create a hospital first.")

      // 1. Insert Patient
      const mrn = `MRN-${Math.floor(Math.random() * 900000) + 100000}`
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          mrn,
          demographics: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            age: parseInt(formData.age),
            gender: formData.gender,
            birth_date: new Date(
              new Date().setFullYear(new Date().getFullYear() - parseInt(formData.age))
            ).toISOString(),
          },
          hospital_id: resolvedHospitalId,
        })
        .select()
        .single()

      if (patientError || !patient) throw new Error(`Patient Error: ${patientError?.message}`)

      // 2. Insert Vitals
      const now = new Date().toISOString()
      await supabase.from("vitals").insert([
        { patient_id: patient.id, type: "BMI", value: formData.bmi, unit: "kg/m²", recorded_at: now },
        { patient_id: patient.id, type: "Blood Pressure Systolic", value: formData.bpSystolic, unit: "mmHg", recorded_at: now },
      ])

      // 3. Insert Lab Results
      const labRows = formData.labs
        .filter(l => l.testName.trim() && l.value.trim())
        .map((lab) => ({
          patient_id: patient.id,
          test_name: lab.testName,
          value: lab.value,
          unit: lab.unit,
          recorded_at: lab.recordedAt || now,
        }))

      if (labRows.length > 0) {
        await supabase.from("lab_results").insert(labRows)
      }

      // 4. Insert Diagnoses History
      const diagnosesToInsert = []
      const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD date only
      if (formData.historyHeartDisease)
        diagnosesToInsert.push({ patient_id: patient.id, condition: "Heart Disease", diagnosed_at: today })
      if (formData.historyStroke)
        diagnosesToInsert.push({ patient_id: patient.id, condition: "Stroke", diagnosed_at: today })
      if (diagnosesToInsert.length > 0)
        await supabase.from("diagnoses").insert(diagnosesToInsert)

      // 4. Call local FastAPI /predict
      const ageNum = parseInt(formData.age)
      const ageGroup = Math.min(13, Math.max(1, Math.ceil(ageNum / 10)))
      const bmiNum = parseFloat(formData.bmi) || 25
      const bpHigh = parseInt(formData.bpSystolic) >= 130 ? 1.0 : 0.0

      const mlPayload = {
        HighBP: bpHigh,
        HighChol: formData.highChol ? 1.0 : 0.0,
        CholCheck: 1.0,
        BMI: bmiNum,
        Smoker: formData.smoker ? 1.0 : 0.0,
        Stroke: formData.historyStroke ? 1.0 : 0.0,
        HeartDiseaseorAttack: formData.historyHeartDisease ? 1.0 : 0.0,
        PhysActivity: formData.physActivity ? 1.0 : 0.0,
        Fruits: 1.0,
        Veggies: 1.0,
        HvyAlcoholConsump: 0.0,
        AnyHealthcare: 1.0,
        NoDocbcCost: 0.0,
        GenHlth: parseFloat(formData.genHlth) || 3.0,
        MentHlth: 0.0,
        PhysHlth: 0.0,
        DiffWalk: 0.0,
        Sex: formData.gender === "Male" ? 1.0 : 0.0,
        Age: ageGroup,
        Education: 5.0,
        Income: 6.0,
      }

      const mlRes = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mlPayload),
      })

      if (!mlRes.ok) {
        throw new Error("Prediction request failed")
      }

      const prediction = await mlRes.json()

      // 5. Save prediction to Supabase (only use confirmed schema columns)
      const { error: predSaveErr } = await supabase.from("predictions").insert({
        patient_id: patient.id,
        disease: "Diabetes",
        probability: prediction.probability,
        severity: prediction.severity,
        confidence: prediction.confidence,
        model_version: prediction.model_version,
      })

      if (predSaveErr) {
        console.warn("Prediction save warning:", predSaveErr.message)
      }

      // 6. Auto-generate alert for High or Critical risk patients
      if (prediction.severity === "High" || prediction.severity === "Critical") {
        await supabase.from("alerts").insert({
          patient_id: patient.id,
          type: `${prediction.severity} Diabetes Risk`,
          severity: prediction.severity,
          status: "New",
        })
      }

      // 7. Navigate to patient detail page
      router.push(`/patients/${patient.id}`)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An unexpected error occurred while creating the patient and prediction.")
      setLoading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-4xl space-y-6 pb-12"
    >
      <motion.div variants={itemVariants} className="flex items-center gap-5">
        <Link href="/patients">
          <button type="button" className="h-10 w-10 rounded-full border border-border/50 bg-muted/30 flex items-center justify-center hover:bg-muted hover:scale-105 transition-all shadow-sm">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">New Patient Assessment</h1>
          <p className="text-muted-foreground mt-1">Input clinical data to immediately trigger the predictive AI model.</p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl shadow-sm border overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardHeader className="bg-muted/10 border-b pb-6">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Stethoscope className="h-5 w-5 text-primary" /> Clinical Profile Registration
              </CardTitle>
              <CardDescription>
                All fields will be processed by the LightGBM engine in real-time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm font-medium flex items-start gap-3"
                >
                  <Loader2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p>{error}</p>
                </motion.div>
              )}

              {/* Patient Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Patient Demographics</h3>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="font-semibold">First Name</Label>
                    <Input
                      id="firstName"
                      className="h-11 rounded-xl transition-all focus:ring-2 focus:ring-primary/20"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="font-semibold">Last Name</Label>
                    <Input
                      id="lastName"
                      className="h-11 rounded-xl transition-all focus:ring-2 focus:ring-primary/20"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="age" className="font-semibold">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      className="h-11 rounded-xl transition-all focus:ring-2 focus:ring-primary/20"
                      required
                      min="1"
                      max="120"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Gender</Label>
                    <Select
                      required
                      value={formData.gender}
                      onValueChange={(val) => setFormData({ ...formData, gender: val })}
                    >
                      <SelectTrigger className="h-11 rounded-xl transition-all focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Clinical Measurements */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <HeartPulse className="h-4 w-4" /> Vitals & Health
                  </h3>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="bmi" className="font-semibold">BMI</Label>
                    <Input
                      id="bmi"
                      type="number"
                      step="0.1"
                      className="h-11 rounded-xl"
                      placeholder="e.g. 25.5"
                      required
                      value={formData.bmi}
                      onChange={(e) => setFormData({ ...formData, bmi: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bpSystolic" className="font-semibold">Systolic Blood Pressure</Label>
                    <div className="relative">
                      <Input
                        id="bpSystolic"
                        type="number"
                        className="h-11 rounded-xl pr-12"
                        placeholder="e.g. 120"
                        required
                        value={formData.bpSystolic}
                        onChange={(e) => setFormData({ ...formData, bpSystolic: e.target.value })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">mmHg</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="genHlth" className="font-semibold">General Health</Label>
                    <Select
                      value={formData.genHlth}
                      onValueChange={(val) => setFormData({ ...formData, genHlth: val })}
                    >
                      <SelectTrigger id="genHlth" className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 — Excellent</SelectItem>
                        <SelectItem value="2">2 — Very Good</SelectItem>
                        <SelectItem value="3">3 — Good</SelectItem>
                        <SelectItem value="4">4 — Fair</SelectItem>
                        <SelectItem value="5">5 — Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Lab Results */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">3</span>
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <TestTube2 className="h-4 w-4" /> Laboratory Results
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      labs: [
                        ...formData.labs,
                        { testName: "", value: "", unit: "", recordedAt: new Date().toISOString().slice(0, 10) }
                      ]
                    })}
                    className="text-xs font-bold text-primary hover:underline bg-primary/10 px-3 py-1.5 rounded-full transition-colors hover:bg-primary/20"
                  >
                    + Add Test
                  </button>
                </div>

                <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed">
                  {formData.labs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No lab tests added yet.</p>
                  )}
                  {formData.labs.map((lab, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="grid gap-4 sm:grid-cols-12 items-end bg-card p-3 rounded-xl border shadow-sm"
                    >
                      <div className="space-y-2 sm:col-span-4">
                        <Label htmlFor={`lab-${index}-name`} className="text-xs">Test Name</Label>
                        <Input
                          id={`lab-${index}-name`}
                          className="h-10 rounded-lg"
                          value={lab.testName}
                          onChange={(e) => {
                            const labs = [...formData.labs]
                            labs[index].testName = e.target.value
                            setFormData({ ...formData, labs })
                          }}
                          placeholder="e.g. HbA1c"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-3">
                        <Label htmlFor={`lab-${index}-value`} className="text-xs">Value</Label>
                        <Input
                          id={`lab-${index}-value`}
                          className="h-10 rounded-lg"
                          value={lab.value}
                          onChange={(e) => {
                            const labs = [...formData.labs]
                            labs[index].value = e.target.value
                            setFormData({ ...formData, labs })
                          }}
                          placeholder="e.g. 6.8"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor={`lab-${index}-unit`} className="text-xs">Unit</Label>
                        <Input
                          id={`lab-${index}-unit`}
                          className="h-10 rounded-lg"
                          value={lab.unit}
                          onChange={(e) => {
                            const labs = [...formData.labs]
                            labs[index].unit = e.target.value
                            setFormData({ ...formData, labs })
                          }}
                          placeholder="e.g. %"
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-3 flex items-center justify-between">
                        <div className="w-full">
                          <Label htmlFor={`lab-${index}-date`} className="text-xs">Date</Label>
                          <Input
                            id={`lab-${index}-date`}
                            type="date"
                            className="h-10 rounded-lg"
                            value={lab.recordedAt}
                            onChange={(e) => {
                              const labs = [...formData.labs]
                              labs[index].recordedAt = e.target.value
                              setFormData({ ...formData, labs })
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const labs = [...formData.labs]
                            labs.splice(index, 1)
                            setFormData({ ...formData, labs })
                          }}
                          className="text-xs font-semibold text-destructive hover:bg-destructive/10 p-2 rounded-lg ml-2 mt-6 transition-colors"
                          title="Remove Lab"
                        >
                          X
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Medical History */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">4</span>
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Medical History & Lifestyle
                  </h3>
                </div>
                <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8 bg-muted/10 p-5 rounded-xl border border-dashed">
                  {[
                    { key: "historyHeartDisease", label: "Prior Heart Disease or Attack" },
                    { key: "historyStroke", label: "Prior Stroke" },
                    { key: "highChol", label: "High Cholesterol" },
                    { key: "smoker", label: "Smoker (≥100 cigarettes in lifetime)" },
                    { key: "physActivity", label: "Physically Active (past 30 days)" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center space-x-3 group">
                      <div className="relative flex items-start">
                        <input
                          type="checkbox"
                          id={key}
                          className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary/50 transition-all cursor-pointer"
                          checked={formData[key as keyof typeof formData] as boolean}
                          onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                        />
                      </div>
                      <label htmlFor={key} className="text-sm font-medium leading-none cursor-pointer group-hover:text-primary transition-colors">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 p-6 sm:px-8">
              <button
                type="submit"
                className="w-full h-14 uiverse-btn flex items-center justify-center text-base rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                    Generating AI Prediction...
                  </>
                ) : (
                  "Save Patient & Run AI Prediction"
                )}
              </button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  )
}
