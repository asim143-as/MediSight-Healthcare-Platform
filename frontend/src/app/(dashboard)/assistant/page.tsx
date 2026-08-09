"use client"

import { useState, useEffect } from "react"
import { AIChatPanel } from "@/components/shared/AIChatPanel"
import { createClient } from "@/lib/supabase/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function getPatientDisplayName(p: any): string {
  const d = p.demographics || {}
  if (d.full_name) return `${d.full_name} (MRN: ${p.mrn})`
  const first = d.first_name || d.firstName || ""
  const last = d.last_name || d.lastName || ""
  const name = `${first} ${last}`.trim()
  return name ? `${name} (MRN: ${p.mrn})` : `MRN: ${p.mrn}`
}

export default function AssistantPage() {
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, demographics, mrn')
        .order('created_at', { ascending: false })
        .limit(50)

      if (!error && data) {
        setPatients(data)
      }
    }
    fetchPatients()
  }, [supabase])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Clinical Assistant</h1>
          <p className="text-muted-foreground">Conversational decision support grounded in patient data.</p>
        </div>
        <div className="w-full sm:w-[320px]">
          <Select
            value={selectedPatientId || "general"}
            onValueChange={(val) => setSelectedPatientId(val === "general" ? null : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select patient context" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">🌐 General / No Patient Selected</SelectItem>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {getPatientDisplayName(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <AIChatPanel patientId={selectedPatientId} key={selectedPatientId || 'general'} />
    </div>
  )
}
