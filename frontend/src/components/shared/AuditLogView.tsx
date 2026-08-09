"use client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, ShieldCheck } from "lucide-react"

const ACTION_COLORS: Record<string, string> = {
  SELECT: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  INSERT: "bg-green-500/10 text-green-600 border-green-500/20",
  UPDATE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  DELETE: "bg-red-500/10 text-red-600 border-red-500/20",
}

export function AuditLogView({ logs }: { logs: any[] }) {
  const [query, setQuery] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [tableFilter, setTableFilter] = useState("all")

  const uniqueTables = [...new Set(logs.map(l => l.table_name))].sort()

  const filtered = logs.filter(l => {
    const actorName = l.profiles?.full_name?.toLowerCase() || ""
    const rowId = l.row_id?.toLowerCase() || ""
    const matchesQuery = !query || actorName.includes(query.toLowerCase()) || rowId.includes(query.toLowerCase()) || l.table_name.includes(query.toLowerCase())
    const matchesAction = actionFilter === "all" || l.action === actionFilter
    const matchesTable = tableFilter === "all" || l.table_name === tableFilter
    return matchesQuery && matchesAction && matchesTable
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by actor, table, or row ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {['SELECT', 'INSERT', 'UPDATE', 'DELETE'].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tableFilter} onValueChange={setTableFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Table" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tables</SelectItem>
            {uniqueTables.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">PHI Audit Trail</span>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {logs.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Timestamp</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Actor</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Table</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Row ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No audit entries match the current filter.
                  </td>
                </tr>
              ) : filtered.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{log.profiles?.full_name || "System"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{log.profiles?.role || ""}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge className={`border ${ACTION_COLORS[log.action] || ""}`}>{log.action}</Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{log.table_name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{log.row_id?.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
