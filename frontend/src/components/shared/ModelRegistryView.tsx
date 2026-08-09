"use client"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, TrendingUp, Clock, Cpu } from "lucide-react"

const METRIC_LABELS: Record<string, string> = {
  auc_roc: "AUC-ROC",
  accuracy: "Accuracy",
  precision: "Precision",
  recall: "Recall",
  f1_score: "F1 Score",
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 80 ? "bg-green-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ModelRegistryView({ models, liveStatus }: { models: any[]; liveStatus: any }) {
  return (
    <div className="space-y-6">
      {/* Live Production Model Card */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Live Production Model</h2>
              <p className="text-xs text-muted-foreground">Real-time status from FastAPI inference service</p>
            </div>
          </div>
          {liveStatus ? (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 border">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Service Online
            </Badge>
          ) : (
            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 border">
              <AlertCircle className="h-3 w-3 mr-1" /> Service Offline
            </Badge>
          )}
        </div>

        {liveStatus && liveStatus.model_loaded ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Model</p>
                  <p className="font-semibold">{liveStatus.model_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="font-semibold font-mono">{liveStatus.version}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-semibold capitalize">{liveStatus.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Trained</p>
                  <p className="font-semibold text-xs">
                    {liveStatus.last_trained ? new Date(liveStatus.last_trained).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {liveStatus.metrics && Object.entries(liveStatus.metrics).map(([key, value]) =>
                METRIC_LABELS[key] ? (
                  <MetricBar key={key} label={METRIC_LABELS[key]} value={value as number} />
                ) : null
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {liveStatus ? "Model not loaded. Train the model first via MLOps tab." : "FastAPI service is not reachable. Start the ML service to view live status."}
          </p>
        )}
      </div>

      {/* Model Registry Table from Supabase */}
      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Model Registry</h2>
          <span className="text-xs text-muted-foreground ml-auto">{models.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left p-4 font-medium text-muted-foreground">Model Name</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Version</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Stage</th>
                <th className="text-left p-4 font-medium text-muted-foreground">AUC-ROC</th>
                <th className="text-left p-4 font-medium text-muted-foreground">F1</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Registered</th>
              </tr>
            </thead>
            <tbody>
              {models.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                    No models in registry yet. Train and register a model via the MLOps tab.
                  </td>
                </tr>
              ) : models.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="p-4 font-medium">{m.name}</td>
                  <td className="p-4 font-mono text-xs">{m.version}</td>
                  <td className="p-4">
                    <Badge className={m.stage === 'Production' 
                      ? "bg-green-500/10 text-green-600 border-green-500/20 border" 
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20 border"
                    }>
                      {m.stage}
                    </Badge>
                  </td>
                  <td className="p-4 font-mono">
                    {m.metrics?.auc_roc != null ? (m.metrics.auc_roc * 100).toFixed(1) + "%" : "—"}
                  </td>
                  <td className="p-4 font-mono">
                    {m.metrics?.f1_score != null ? (m.metrics.f1_score * 100).toFixed(1) + "%" : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
