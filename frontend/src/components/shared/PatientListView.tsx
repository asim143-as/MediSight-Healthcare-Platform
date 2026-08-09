"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { DataTable } from "@/components/shared/DataTable"
import { RiskBadge } from "@/components/shared/RiskBadge"
import Link from "next/link"
import { Plus, Search, Users, Trash2, Pencil, UserSearch } from "lucide-react"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"

// Format vital/lab type names from snake_case to Title Case
function formatName(str: string): string {
  if (!str) return "—"
  const abbreviations: Record<string, string> = {
    bmi: "BMI", bp: "BP", mrn: "MRN", hdl: "HDL", ldl: "LDL"
  }
  return str.split(/[_\s]+/).map(w => abbreviations[w.toLowerCase()] || w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

// Get patient display name from demographics JSONB — handles multiple field name conventions
function getPatientName(p: any): string {
  const d = p.demographics
  if (!d) return "—"
  // Handle full_name or name field
  if (d.full_name) return d.full_name
  if (d.name) return d.name
  // Handle split first/last (camelCase or snake_case)
  const first = d.first_name || d.firstName || ""
  const last = d.last_name || d.lastName || ""
  const full = `${first} ${last}`.trim()
  return full || "—"
}

function getAge(p: any): string {
  const d = p.demographics
  if (!d) return "—"
  if (d.age) return String(d.age)
  // Derive from birth_date if age missing
  if (d.birth_date || d.dob) {
    const dob = new Date(d.birth_date || d.dob)
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    return String(age)
  }
  return "—"
}

function getGender(p: any): string {
  const d = p.demographics
  if (!d) return "—"
  const g = d.gender || ""
  return g ? g.charAt(0).toUpperCase() + g.slice(1).toLowerCase() : "—"
}

function getLatestSeverity(p: any): string | null {
  const preds = p.predictions || []
  if (preds.length === 0) return null
  const sorted = [...preds].sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return sorted[0]?.severity || null
}

interface PatientListViewProps {
  patients: any[]
  initialSearch?: string
  isAdmin?: boolean
}

export function PatientListView({ patients, initialSearch = "", isAdmin = false }: PatientListViewProps) {
  const [query, setQuery] = useState(initialSearch)
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDeletePatient = async (patientId: string) => {
    if (!window.confirm('Delete this patient record? This action cannot be undone.')) return
    setDeleteError(null)
    setDeletingId(patientId)

    const { error } = await supabase.from('patients').delete().eq('id', patientId)
    if (error) {
      setDeleteError(error.message)
      setDeletingId(null)
      return
    }

    router.refresh()
  }

  useEffect(() => {
    setQuery(initialSearch)
  }, [initialSearch])

  const normalizedPatients = useMemo(() => {
    const seen = new Set<string>()
    return patients.filter((patient) => {
      if (!patient?.id || seen.has(patient.id)) return false
      seen.add(patient.id)
      return true
    })
  }, [patients])

  const filtered = useMemo(() => {
    if (!query.trim()) return normalizedPatients
    const q = query.toLowerCase()
    return normalizedPatients.filter(p => {
      const name = getPatientName(p).toLowerCase()
      const mrn = (p.mrn || "").toLowerCase()
      return name.includes(q) || mrn.includes(q)
    })
  }, [normalizedPatients, query])

  const columns = [
    {
      header: "MRN",
      cell: (p: any) => (
        <span className="font-mono text-xs text-muted-foreground">{p.mrn}</span>
      )
    },
    {
      header: "Patient Name",
      cell: (p: any) => {
        const name = getPatientName(p)
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
              <span className="text-xs font-semibold text-primary">
                {name !== "—" ? name.charAt(0).toUpperCase() : "?"}
              </span>
            </div>
            <span className="font-medium">{name}</span>
          </div>
        )
      }
    },
    {
      header: "Age",
      cell: (p: any) => <span className="text-sm">{getAge(p)}</span>
    },
    {
      header: "Gender",
      cell: (p: any) => <span className="text-sm">{getGender(p)}</span>
    },
    {
      header: "Hospital",
      cell: (p: any) => (
        <span className="text-xs text-muted-foreground">{p.hospitals?.name || "—"}</span>
      )
    },
    {
      header: "Risk Status",
      cell: (p: any) => {
        const severity = getLatestSeverity(p)
        const preds = p.predictions || []
        const latest = preds.length > 0 ? [...preds].sort((a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0] : null
        if (severity) {
          return (
            <div className="flex flex-col gap-0.5">
              <RiskBadge severity={severity} />
              {latest?.disease && <span className="text-[10px] text-muted-foreground">{latest.disease}</span>}
            </div>
          )
        }
        return (
          <Link href={`/patients/new`} className="text-xs text-primary hover:underline">
            Run Prediction
          </Link>
        )
      }
    },
    {
      header: "Actions",
      cell: (p: any) => (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/patients/${p.id}`} className="text-sm font-medium text-primary hover:underline">
            View
          </Link>
          {isAdmin && (
            <>
              <Link href={`/patients/${p.id}`} className="text-sm text-foreground/80 hover:text-foreground underline">
                Edit
              </Link>
              <button
                type="button"
                onClick={() => handleDeletePatient(p.id)}
                disabled={deletingId === p.id}
                className="text-sm text-destructive underline disabled:cursor-not-allowed disabled:text-destructive/50"
              >
                {deletingId === p.id ? 'Deleting…' : 'Delete'}
              </button>
            </>
          )}
        </div>
      )
    }
  ]

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
      className="space-y-6 max-w-7xl mx-auto pb-8"
    >
      {deleteError && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive shadow-sm flex items-center gap-3"
        >
          <Trash2 className="h-4 w-4 flex-shrink-0" />
          <p>{deleteError}</p>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Patient Registry</h1>
          <p className="mt-1.5 text-sm text-muted-foreground/80">
            Monitoring <span className="font-semibold text-foreground">{filtered.length}</span> of {normalizedPatients.length} recent patient records.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative group">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search by name or MRN..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 h-11 w-full sm:w-64 rounded-xl border-border/50 bg-card shadow-sm transition-all focus:bg-background focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
          <Link href="/patients/new" prefetch={true} className="uiverse-btn h-11 px-6 whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Link>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="overflow-hidden rounded-2xl border bg-card shadow-sm hover:shadow-md transition-shadow duration-300">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-muted/10"
            >
              <div className="p-4 rounded-full bg-background border border-dashed mb-4">
                <UserSearch className="h-8 w-8 opacity-40 text-primary" />
              </div>
              <p className="text-base font-semibold text-foreground">No patients found</p>
              <p className="text-xs mt-1 max-w-[250px] text-center">Try adjusting your search query or add a new patient assessment.</p>
            </motion.div>
          ) : (
            <motion.div 
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-x-auto custom-scrollbar"
            >
              <div className="min-w-[800px]">
                <DataTable columns={columns} data={filtered} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
