"use client"
import { useState, useMemo } from "react"
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RefreshCw, Zap, AlertTriangle, CheckCircle2, Clock, TrendingDown } from "lucide-react"

const DRIFT_THRESHOLD = 0.10 // 10% PSI threshold

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MLOpsView({
  driftData,
  modelStatus,
  predictionTrend,
  serviceConnected = false,
  mlServiceUrl = 'http://localhost:8000',
}: {
  driftData: any
  modelStatus: any
  predictionTrend: any[]
  serviceConnected?: boolean
  mlServiceUrl?: string
}) {
  const isDemo = modelStatus?._demo === true
  const [retraining, setRetraining] = useState(false)
  const [retrainMsg, setRetrainMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Aggregate daily prediction volume + avg probability from raw prediction rows
  const dailyTrend = useMemo(() => {
    const map: Record<string, { date: string; count: number; avgProb: number; probSum: number; critical: number; high: number }> = {}
    for (const p of predictionTrend) {
      const day = p.created_at?.slice(0, 10)
      if (!day) continue
      if (!map[day]) map[day] = { date: day, count: 0, avgProb: 0, probSum: 0, critical: 0, high: 0 }
      map[day].count++
      map[day].probSum += p.probability || 0
      if (p.severity === 'Critical') map[day].critical++
      if (p.severity === 'High') map[day].high++
    }
    return Object.values(map)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, avgProb: +(d.probSum / d.count).toFixed(3), date: formatDate(d.date) }))
  }, [predictionTrend])

  // Build PSI drift history from driftData if available
  const psiHistory = driftData?.psi_history || []
  const currentPsi = driftData?.current_psi ?? null
  const driftDetected = currentPsi !== null && currentPsi > DRIFT_THRESHOLD

  const handleRetrain = async () => {
    setRetraining(true)
    setRetrainMsg(null)
    try {
      const ML_URL = process.env.NEXT_PUBLIC_ML_SERVICE_URL || 'http://localhost:8000'
      const res = await fetch(`${ML_URL}/retrain`, { method: 'POST' })
      const data = await res.json()
      setRetrainMsg({ type: 'success', text: data.status || 'Retraining triggered in background.' })
    } catch (e: any) {
      setRetrainMsg({ type: 'error', text: 'Could not reach the ML service. Ensure FastAPI is running.' })
    } finally {
      setRetraining(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Not-Connected Banner */}
      {!serviceConnected && (
        <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-700 dark:text-amber-400">FastAPI ML Service Not Connected</p>
            <p className="text-muted-foreground">
              The prediction engine is not reachable at <code className="font-mono bg-muted px-1 rounded text-xs">{mlServiceUrl}</code>.
              Prediction trend data below is loaded directly from the database.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              To start the service: open a terminal in <code className="font-mono bg-muted px-1 rounded">ml-service/</code> and run{' '}
              <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">uvicorn app.main:app --reload --port 8000</code>
            </p>
          </div>
        </div>
      )}

      {/* Header cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Service Status</p>
          <div className="flex items-center gap-2 mt-1">
            {serviceConnected
              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
              : <AlertTriangle className="h-4 w-4 text-amber-500" />
            }
            <p className="font-semibold text-sm">{serviceConnected ? "Connected" : "Not Connected"}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Retrain Status</p>
          <p className="font-semibold text-sm mt-1 capitalize">{modelStatus?.status || "—"}</p>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">Current PSI</p>
          <p className={`font-semibold text-sm mt-1 ${driftDetected ? 'text-red-500' : 'text-green-600'}`}>
            {currentPsi !== null ? currentPsi.toFixed(4) : "N/A"}
            {driftDetected && " ⚠️"}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-muted-foreground">14-Day Predictions</p>
          <p className="font-semibold text-sm mt-1">
            {predictionTrend.length.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Drift Alert Banner */}
      {driftDetected && (
        <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm">
          <TrendingDown className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-600">Data Drift Detected</p>
            <p className="text-muted-foreground">
              PSI of {currentPsi?.toFixed(4)} exceeds the {DRIFT_THRESHOLD} threshold. Consider triggering a retrain below.
            </p>
          </div>
        </div>
      )}

      {/* Retraining Panel */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-semibold">Trigger Model Retraining</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Starts a background retraining job on the ML service using the full training dataset. 
              The new model will be evaluated and promoted to production automatically if it outperforms the current one.
            </p>
            {modelStatus?.last_trained && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Last trained: {new Date(modelStatus.last_trained).toLocaleString()}
              </p>
            )}
          </div>
          <Button
            onClick={handleRetrain}
            disabled={retraining || !serviceConnected || modelStatus?.status === 'training'}
            className="ml-4 flex-shrink-0"
          >
            {retraining ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Triggering...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Retrain Now</>
            )}
          </Button>
        </div>
        {retrainMsg && (
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            retrainMsg.type === 'success'
              ? 'bg-green-500/10 text-green-700 border border-green-500/20'
              : 'bg-red-500/10 text-red-700 border border-red-500/20'
          }`}>
            {retrainMsg.text}
          </div>
        )}
        {!serviceConnected && (
          <p className="mt-3 text-xs text-muted-foreground">
            ⚠️ Start the FastAPI service to enable retraining: <code className="font-mono bg-muted px-1 rounded">uvicorn app.main:app --reload</code>
          </p>
        )}
      </div>

      {/* 14-Day Prediction Volume Chart */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="font-semibold mb-4">14-Day Prediction Volume & Avg Risk Score</h2>
        {dailyTrend.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border rounded-lg border-dashed">
            No prediction data in the last 14 days.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="count" name="Predictions" stroke="hsl(var(--primary))" fill="url(#colorCount)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* PSI Drift History Chart */}
      {psiHistory.length > 0 && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">Feature Drift (PSI) History</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={psiHistory} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <ReferenceLine y={DRIFT_THRESHOLD} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Threshold', fill: '#ef4444', fontSize: 11 }} />
              <Line type="monotone" dataKey="psi" name="PSI" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Critical/High breakdown bar chart */}
      {dailyTrend.length > 0 && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold mb-4">High & Critical Predictions per Day</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyTrend} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
              <Bar dataKey="high" name="High" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="critical" name="Critical" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
