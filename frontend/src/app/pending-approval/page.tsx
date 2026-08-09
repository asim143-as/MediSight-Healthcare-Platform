"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Clock, XCircle, LogOut } from "lucide-react"

export default function PendingApprovalPage() {
  const [status, setStatus] = useState<"pending" | "rejected" | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }
      const { data: doctor } = await supabase.from("doctors").select("status").eq("user_id", user.id).single()
      if (doctor?.status === "approved") {
        router.push("/dashboard")
        return
      }
      setStatus((doctor?.status as "pending" | "rejected") || "pending")
      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Loading...</div>

  const isRejected = status === "rejected"

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${isRejected ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
          {isRejected ? <XCircle className="h-7 w-7" /> : <Clock className="h-7 w-7" />}
        </div>

        {isRejected ? (
          <>
            <h1 className="text-xl font-bold">Registration Not Approved</h1>
            <p className="text-sm text-muted-foreground">
              Your doctor registration has been rejected. Please contact the administrator for more information.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold">Awaiting Administrator Approval</h1>
            <p className="text-sm text-muted-foreground">
              Your account has been created successfully. It is currently awaiting administrator approval before you can
              access the Doctor Portal. We'll notify you once it's reviewed.
            </p>
          </>
        )}

        <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  )
}
