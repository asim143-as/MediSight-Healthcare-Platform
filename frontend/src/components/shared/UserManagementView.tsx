"use client"
import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, UserCheck, RefreshCw } from "lucide-react"

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-500/20",
  hospital_admin: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  doctor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  nurse: "bg-green-500/10 text-green-600 border-green-500/20",
  data_scientist: "bg-purple-500/10 text-purple-600 border-purple-500/20",
}

const ALL_ROLES = ['super_admin', 'hospital_admin', 'doctor', 'nurse', 'data_scientist']

export function UserManagementView({ profiles, hospitals }: { profiles: any[], hospitals: any[] }) {
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [localProfiles, setLocalProfiles] = useState(profiles)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const filtered = localProfiles.filter(p => {
    const name = p.full_name?.toLowerCase() || ""
    const matchesQuery = !query || name.includes(query.toLowerCase())
    const matchesRole = roleFilter === "all" || p.role === roleFilter
    return matchesQuery && matchesRole
  })

  const handleRoleChange = async (profileId: string, newRole: string) => {
    setUpdatingId(profileId)
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', profileId)
    if (!error) {
      setLocalProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p))
    }
    setUpdatingId(null)
  }

  const handleHospitalChange = async (profileId: string, newHospitalId: string) => {
    setUpdatingId(profileId)
    const { error } = await supabase
      .from('profiles')
      .update({ hospital_id: newHospitalId || null })
      .eq('id', profileId)
    if (!error) {
      setLocalProfiles(prev => prev.map(p => {
        if (p.id === profileId) {
          const hospital = hospitals.find(h => h.id === newHospitalId)
          return { ...p, hospital_id: newHospitalId, hospitals: hospital ? { name: hospital.name } : null }
        }
        return p
      }))
    }
    setUpdatingId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ALL_ROLES.map(r => (
              <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Hospital</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No users match the current filter.
                  </td>
                </tr>
              ) : filtered.map((profile) => (
                <tr key={profile.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {profile.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{profile.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{profile.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Select
                      value={profile.role}
                      onValueChange={(val) => handleRoleChange(profile.id, val)}
                      disabled={updatingId === profile.id}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map(r => (
                          <SelectItem key={r} value={r} className="text-xs">{r.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <Select
                      value={profile.hospital_id || "none"}
                      onValueChange={(val) => handleHospitalChange(profile.id, val === "none" ? "" : val)}
                      disabled={updatingId === profile.id}
                    >
                      <SelectTrigger className="w-44 h-8 text-xs">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs text-muted-foreground">Unassigned</SelectItem>
                        {hospitals.map(h => (
                          <SelectItem key={h.id} value={h.id} className="text-xs">{h.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-4">
                    {updatingId === profile.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <UserCheck className="h-4 w-4 text-green-500" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t bg-muted/10 text-xs text-muted-foreground">
          {filtered.length} of {localProfiles.length} users shown
        </div>
      </div>
    </div>
  )
}
