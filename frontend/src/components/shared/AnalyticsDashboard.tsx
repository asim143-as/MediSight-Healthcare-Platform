"use client"
import { useMemo } from "react"
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts"
import { TrendingUp, Users, AlertTriangle, Activity } from "lucide-react"

const SEVERITY_COLORS: Record<string, string> = {
  Low: "#22c55e",
  Moderate: "#f59e0b",
  High: "#f97316",
  Critical: "#ef4444",
}

const DISEASE_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#f97316", "#ec4899", "#8b5cf6"]

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-sm">
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </div>
  )
}

export function AnalyticsDashboard({ predictions, patientsByHospital, alertStats, recentPredictions }: {
  predictions: any[]
  patientsByHospital: any[]
  alertStats: any[]
  recentPredictions: any[]
}) {
  // 1. Severity distribution
  const severityData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of predictions) {
      counts[p.severity] = (counts[p.severity] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [predictions])

  // 2. Disease distribution
  const diseaseData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of predictions) {
      if (p.disease) counts[p.disease] = (counts[p.disease] || 0) + 1
    }
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [predictions])

  // 3. Patients per hospital
  const hospitalData = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {}
    for (const p of patientsByHospital) {
      const name = p.hospitals?.name || "Unknown"
      if (!counts[name]) counts[name] = { name, count: 0 }
      counts[name].count++
    }
    return Object.values(counts).sort((a, b) => b.count - a.count)
  }, [patientsByHospital])

  // 4. 30-day risk score trend (daily avg probability)
  const riskTrend = useMemo(() => {
    const map: Record<string, { date: string; avgRisk: number; sum: number; count: number }> = {}
    for (const p of recentPredictions) {
      const day = p.created_at?.slice(0, 10)
      if (!day) continue
      if (!map[day]) map[day] = { date: day, avgRisk: 0, sum: 0, count: 0 }
      map[day].sum += p.probability || 0
      map[day].count++
    }
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        avgRisk: +(d.sum / d.count).toFixed(3),
      }))
  }, [recentPredictions])

  // 5. Alert status breakdown
  const alertStatusData = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const a of alertStats) {
      counts[a.status] = (counts[a.status] || 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [alertStats])

  // 6. Severity radar across diseases
  const radarData = useMemo(() => {
    const severities = ['Low', 'Moderate', 'High', 'Critical']
    const diseases = [...new Set(predictions.map(p => p.disease).filter(Boolean))].slice(0, 5)
    return severities.map(sev => {
      const row: any = { severity: sev }
      for (const d of diseases) {
        row[d] = predictions.filter(p => p.disease === d && p.severity === sev).length
      }
      return row
    })
  }, [predictions])

  const diseaseKeys = [...new Set(predictions.map(p => p.disease).filter(Boolean))].slice(0, 5)

  const criticalCount = alertStats.filter(a => a.severity === 'Critical').length
  const avgRisk = predictions.length > 0
    ? (predictions.reduce((s, p) => s + (p.probability || 0), 0) / predictions.length * 100).toFixed(1)
    : "0"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clinical Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Population-level risk insights across all patients and hospitals.</p>
      </div>

      {predictions.length === 0 && (
        <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 text-center">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary/40" />
          <p className="font-medium text-sm">No prediction data yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Analytics populate automatically as you add patients and run AI predictions.
            Go to <span className="text-primary font-medium">Patients → Add Patient &amp; Predict</span> to get started.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Predictions" value={predictions.length.toLocaleString()} sub="All time" />
        <StatCard icon={TrendingUp} label="Avg Risk Score" value={`${avgRisk}%`} sub="Across all patients" />
        <StatCard icon={AlertTriangle} label="Critical Alerts" value={criticalCount} sub="Total generated" />
        <StatCard icon={Activity} label="Hospitals Tracked" value={hospitalData.length} sub="Active facilities" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Severity Distribution Pie */}
        <ChartCard title="Risk Severity Distribution">
          {severityData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" nameKey="name">
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Disease Distribution Bar */}
        <ChartCard title="Disease Distribution">
          {diseaseData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={diseaseData} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="value" name="Predictions" radius={[0, 4, 4, 0]}>
                  {diseaseData.map((_, i) => (
                    <Cell key={i} fill={DISEASE_COLORS[i % DISEASE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 30-Day Risk Trend Area Chart */}
        <ChartCard title="30-Day Average Risk Score Trend">
          {riskTrend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed">No data in last 30 days.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={riskTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} formatter={(v: any) => [(v * 100).toFixed(1) + '%', 'Avg Risk']} />
                <Area type="monotone" dataKey="avgRisk" stroke="#ef4444" fill="url(#riskGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Patients per Hospital Bar */}
        <ChartCard title="Patient Volume by Hospital">
          {hospitalData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed">No hospital data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hospitalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Bar dataKey="count" name="Patients" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Alert Status + Severity Radar — Full Width */}
      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Alert Status Breakdown">
          {alertStatusData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed">No alerts generated yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={alertStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {alertStatusData.map((_, i) => (
                    <Cell key={i} fill={["#22c55e", "#f59e0b", "#94a3b8"][i % 3]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Severity Radar by Disease">
          {radarData.length === 0 || diseaseKeys.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed">Insufficient data for radar chart.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="severity" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} tick={{ fontSize: 9 }} />
                {diseaseKeys.map((d, i) => (
                  <Radar key={d} name={d} dataKey={d} stroke={DISEASE_COLORS[i % DISEASE_COLORS.length]} fill={DISEASE_COLORS[i % DISEASE_COLORS.length]} fillOpacity={0.2} />
                ))}
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
