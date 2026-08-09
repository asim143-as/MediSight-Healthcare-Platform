import Link from "next/link"
import { Shield, Brain, Stethoscope, HeartPulse, Activity, Sparkles, Award, ArrowRight, CheckCircle2, Phone, Mail, Clock, MapPin } from "lucide-react"

export default function AboutPage() {
  const departments = [
    { name: "Cardiology", desc: "AI-assisted ischemic heart disease risk scoring & ECG signal analytics.", icon: HeartPulse, count: "12 Specialists" },
    { name: "Endocrinology", desc: "Predictive early-onset Diabetes Mellitus modeling & glucose monitoring.", icon: Activity, count: "8 Specialists" },
    { name: "Nephrology", desc: "Chronic Kidney Disease trajectory modeling and eGFR drift alerts.", icon: Stethoscope, count: "6 Specialists" },
    { name: "Clinical AI MLOps", desc: "Real-time PSI drift analysis, automated retraining & explainability.", icon: Brain, count: "4 Data Scientists" },
  ]

  const metrics = [
    { value: "98.4%", label: "Model Predictive Accuracy" },
    { value: "50,000+", label: "Patient Records Analyzed" },
    { value: "< 200ms", label: "Real-time Inference Speed" },
    { value: "24 / 7", label: "Automated Clinical Alerting" },
  ]

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-10">
      {/* Novena-inspired Hero Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3.5 py-1 text-xs font-semibold text-sky-300 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" /> Total Healthcare & Decision Support Solution
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Your Most Trusted Clinical AI Partner
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            MediSight AI bridges the gap between traditional clinical care and state-of-the-art predictive machine learning models, empowering doctors with early disease detection and actionable risk insights.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/patients/new" className="uiverse-btn">
              New Patient Risk Assessment <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link href="/doctors" className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
              Meet Our Doctors
            </Link>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Brain className="w-96 h-96 text-sky-400" />
        </div>
      </div>

      {/* Feature & Working Hours Cards (Inspired by Novena Novena-block) */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition uiverse-card flex flex-col justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
              <Stethoscope className="h-6 w-6" />
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-primary">24 Hours Monitoring</span>
            <h3 className="text-lg font-bold mt-1">Predictive Risk Assessment</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Instant multi-disease risk calculation for Heart Disease, Diabetes, and Chronic Kidney Disease powered by trained ML pipelines.
            </p>
          </div>
          <Link href="/patients/new" className="text-xs font-semibold text-primary hover:underline mt-4 inline-flex items-center">
            Run Assessment <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition uiverse-card flex flex-col justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 mb-4">
              <Clock className="h-6 w-6" />
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-sky-600">Operational Hours</span>
            <h3 className="text-lg font-bold mt-1">Clinical AI Service</h3>
            <ul className="text-xs space-y-2 text-muted-foreground mt-3">
              <li className="flex justify-between border-b pb-1"><span>Inference Engine:</span> <span className="font-semibold text-foreground">24/7 Uptime</span></li>
              <li className="flex justify-between border-b pb-1"><span>Doctor Support:</span> <span className="font-semibold text-foreground">08:00 - 20:00 EST</span></li>
              <li className="flex justify-between"><span>Alert Response:</span> <span className="font-semibold text-foreground">Immediate</span></li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition uiverse-card flex flex-col justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-600">Emergency & Alerts</span>
            <h3 className="text-lg font-bold mt-1">1-800-MEDISIGHT</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Automated webhook alerts notify critical care teams instantly whenever a high-risk patient threshold is breached.
            </p>
          </div>
          <Link href="/alerts" className="text-xs font-semibold text-emerald-600 hover:underline mt-4 inline-flex items-center">
            View Alerts Center <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="rounded-xl border bg-card p-8 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {metrics.map((m, i) => (
            <div key={i} className="space-y-1">
              <div className="text-2xl sm:text-4xl font-extrabold text-primary">{m.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Departments Grid (Novena Specialization section) */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Clinical Departments & AI Specialties</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Bridging specialized clinical departments with validated machine learning decision support models.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {departments.map((dept, idx) => (
            <div key={idx} className="rounded-xl border bg-card p-5 shadow-sm hover:border-primary/50 transition uiverse-card">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <dept.icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{dept.count}</span>
              </div>
              <h3 className="font-bold text-base">{dept.name}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{dept.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
