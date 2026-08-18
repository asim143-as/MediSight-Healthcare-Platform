"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect, useRef } from "react"
import { motion, useInView, animate } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import {
  Phone,
  Mail,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  Brain,
  Activity,
  Shield,
  Droplet,
  Star,
  ChevronDown,
  Users,
  Award,
  Clock,
  TrendingUp,
  BadgeCheck,
  HeadphonesIcon,
  Globe,
  MessageCircle,
  Share2,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Count-up number animation for stats                                */
/* ------------------------------------------------------------------ */

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-50px" })
  const numeric = parseFloat(value.replace(/[^0-9.]/g, "")) || 0
  const suffix = value.replace(/[0-9.,]/g, "")

  useEffect(() => {
    if (!inView || !ref.current) return
    const controls = animate(0, numeric, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate(v) {
        if (ref.current) {
          ref.current.textContent = (numeric % 1 !== 0 ? v.toFixed(1) : Math.round(v).toLocaleString()) + suffix
        }
      },
    })
    return () => controls.stop()
  }, [inView, numeric, suffix])

  return <span ref={ref}>0{suffix}</span>
}

/* Rotating accent colors for cards — keeps the site colorful, not monotone */
const ACCENTS = [
  { text: "text-red-500", bg: "bg-red-500/10", ring: "group-hover:shadow-red-500/20" },
  { text: "text-emerald-500", bg: "bg-emerald-500/10", ring: "group-hover:shadow-emerald-500/20" },
  { text: "text-blue-500", bg: "bg-blue-500/10", ring: "group-hover:shadow-blue-500/20" },
  { text: "text-violet-500", bg: "bg-violet-500/10", ring: "group-hover:shadow-violet-500/20" },
  { text: "text-cyan-500", bg: "bg-cyan-500/10", ring: "group-hover:shadow-cyan-500/20" },
  { text: "text-amber-500", bg: "bg-amber-500/10", ring: "group-hover:shadow-amber-500/20" },
]

/* ------------------------------------------------------------------ */
/*  Content data                                                       */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "50,000+", label: "Patients Monitored" },
  { value: "1,200+", label: "Expert Doctors" },
  { value: "98.4%", label: "Prediction Accuracy" },
  { value: "7+", label: "Years of Innovation" },
]

const services = [
  {
    num: "01",
    title: "AI Risk Prediction",
    icon: Brain,
    desc: "Instant multi-disease risk scoring for heart disease, diabetes, and kidney disease powered by trained clinical ML pipelines.",
  },
  {
    num: "02",
    title: "Cardiology Screening",
    icon: HeartPulse,
    desc: "AI-assisted ischemic heart disease risk scoring paired with real-time cardiovascular analytics for early intervention.",
  },
  {
    num: "03",
    title: "Diabetes & Endocrinology",
    icon: Activity,
    desc: "Predictive early-onset diabetes modeling with continuous glucose trend monitoring and personalized alerts.",
  },
  {
    num: "04",
    title: "Kidney Health Monitoring",
    icon: Droplet,
    desc: "Chronic kidney disease trajectory modeling with eGFR drift detection so care teams can act before symptoms appear.",
  },
  {
    num: "05",
    title: "Telemedicine Consults",
    icon: Stethoscope,
    desc: "Secure virtual consultations that connect patients with specialists, with full history and AI insights on hand.",
  },
  {
    num: "06",
    title: "24/7 Critical Alerts",
    icon: Shield,
    desc: "Automated clinical alerting pipeline that flags high-risk changes in patient vitals the moment they occur.",
  },
]

const testimonials = [
  { name: "Dr. Sara Ahmed", role: "Cardiologist", quote: "The AI risk scores catch patterns I would have needed weeks of data to notice. It's changed how our team prioritizes patients." },
  { name: "Dr. Bilal Hussain", role: "General Physician", quote: "Explainable predictions mean I can actually justify a recommendation to my patient, not just point at a black box." },
  { name: "Ayesha Khan", role: "Patient", quote: "Booking, results, and my doctor's notes are all in one place now. It genuinely feels like a modern hospital experience." },
  { name: "Dr. Omar Farooq", role: "Nephrologist", quote: "The CKD drift alerts flagged a patient three weeks before they would have shown clinical symptoms. That's real impact." },
  { name: "Dr. Hina Malik", role: "Endocrinologist", quote: "My favorite part is how fast the dashboard loads during rounds — under 200ms inference means zero waiting." },
  { name: "Usman Tariq", role: "Patient", quote: "I finally understand my own lab trends because the platform explains what each number actually means for me." },
]

const whyChooseUs = [
  { icon: Award, title: "Expert Doctors", desc: "Board-certified specialists across cardiology, endocrinology, and nephrology." },
  { icon: Brain, title: "AI-Powered Diagnostics", desc: "SHAP-explainable predictions your care team can trust and act on." },
  { icon: BadgeCheck, title: "Enterprise-Grade Security", desc: "HIPAA-minded architecture with row-level security on every record." },
  { icon: HeadphonesIcon, title: "24/7 Support", desc: "Round-the-clock monitoring and rapid clinical alert response." },
]

const faqs = [
  { q: "What is MediSight AI?", a: "MediSight AI is a clinical decision-support platform that combines patient records, real-time monitoring, and explainable machine learning to help doctors detect disease risk earlier." },
  { q: "How accurate are the AI predictions?", a: "Our models are trained on large clinical datasets and validated for accuracy, with every prediction accompanied by a SHAP-based explanation so doctors can see exactly why a score was given." },
  { q: "Is my medical data secure?", a: "Yes. We use row-level security, encrypted storage, and role-based access control so only authorized care providers can view patient data." },
  { q: "Can patients book appointments directly?", a: "Yes, patients can register, book consultations, and view their own risk insights and lab results through their secure dashboard." },
  { q: "Do I need to be a hospital to use this?", a: "No. MediSight AI supports independent clinics, multi-hospital networks, and individual practitioners alike." },
]

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function WelcomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [doctors, setDoctors] = useState<{ id: string; full_name: string; specialty: string; avatar_url?: string | null; consultation_fee?: number | null }[]>([])
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, specialty, avatar_url, consultation_fee")
      .eq("role", "doctor")
      .limit(8)
      .then(({ data }) => setDoctors(data || []))
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top utility bar */}
      <div className="hidden bg-gradient-brand text-white md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2 text-xs">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Emergency: +92 800 987 654</span>
            <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> support@medisight.ai</span>
          </div>
          <span>Get 30% off your first AI health screening</span>
        </div>
      </div>

      {/* Header / nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
              <Image src="/logo.png" alt="MediSight AI" fill className="object-cover" />
            </div>
            <span className="font-heading text-lg font-bold">MediSight AI</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
            <a href="#services" className="transition hover:text-foreground">Services</a>
            <a href="#doctors" className="transition hover:text-foreground">Doctors</a>
            <a href="#about" className="transition hover:text-foreground">About</a>
            <a href="#testimonials" className="transition hover:text-foreground">Testimonials</a>
            <a href="#faq" className="transition hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-muted-foreground transition hover:text-foreground sm:block">Sign in</Link>
            <Link href="/signup">
              <span className="btn-premium inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
                Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#050b1d] via-[#0b1531] to-[#0d1a3a]">
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1551190822-a9333d879b1f?auto=format&fit=crop&w=2000&q=80"
            alt="Clinical team reviewing patient data"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050b1d]/95 via-[#0b1531]/90 to-[#0b1531]/60" />
        </div>

        {/* Colorful floating accent blobs */}
        <motion.div
          className="blob left-[10%] top-10 h-72 w-72 bg-red-500"
          animate={{ y: [0, -20, 0], x: [0, 15, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="blob right-[15%] top-1/3 h-80 w-80 bg-emerald-400"
          animate={{ y: [0, 25, 0], x: [0, -15, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="blob bottom-10 left-1/4 h-64 w-64 bg-cyan-400"
          animate={{ y: [0, -15, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        <div className="mx-auto max-w-7xl px-6 py-28 md:py-36">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
            className="max-w-2xl"
          >
            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="kicker mb-6 border-white/20 !bg-white/10 !text-cyan"
            >
              Trusted Clinical AI Platform
            </motion.p>
            <h1 className="font-heading text-4xl font-extrabold leading-[1.1] text-white sm:text-6xl">
              {["Clinical intelligence,"].map((line) => (
                <motion.span
                  key={line}
                  variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
                  className="block"
                >
                  {line}
                </motion.span>
              ))}
              <motion.span
                variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
                className="block gradient-text"
              >
                delivered with confidence.
              </motion.span>
            </h1>
            <motion.p
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="mt-6 max-w-lg text-base leading-7 text-white/75"
            >
              Predictive risk models, explainable AI, and real-time patient insights — all in one secure workspace built for modern care teams.
            </motion.p>
            <motion.div
              variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
              className="mt-9 flex flex-wrap gap-4"
            >
              <Link href="/signup">
                <motion.span
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-premium inline-flex items-center rounded-xl px-7 py-3.5 text-sm font-semibold text-white"
                >
                  Book Appointment <ArrowRight className="ml-2 h-4 w-4" />
                </motion.span>
              </Link>
              <Link href="/login">
                <motion.span
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center rounded-xl border border-white/25 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
                >
                  Sign In
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="relative z-10 mx-auto hidden w-full max-w-7xl justify-center pb-6 md:flex"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-6 w-6 text-white/50" />
        </motion.div>

        {/* Trust strip */}
        <div className="relative z-10 border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-5 text-xs font-semibold uppercase tracking-wider text-white/60">
            <span>HIPAA-Minded Security</span>
            <span>SHAP Explainable AI</span>
            <span>Real-Time Alerting</span>
            <span>Multi-Hospital Ready</span>
            <span>Board-Certified Specialists</span>
          </div>
        </div>
      </section>

      {/* About + stats */}
      <section id="about" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="relative mt-8 aspect-[3/4] overflow-hidden rounded-2xl shadow-premium">
                <Image src="https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=800&q=80" alt="Doctor with stethoscope" fill className="object-cover" />
              </div>
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-premium">
                <Image src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=800&q=80" alt="Clinical team" fill className="object-cover" />
              </div>
            </div>
          </div>

          <div>
            <p className="kicker mb-4">About Us</p>
            <h2 className="font-heading text-3xl font-bold leading-tight sm:text-4xl">
              Compassionate care, <span className="gradient-text">powered by AI</span>
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              MediSight AI bridges the gap between traditional clinical care and state-of-the-art predictive machine learning, empowering doctors with early disease detection and actionable, explainable risk insights — so every decision is backed by evidence, not guesswork.
            </p>
            <Link href="/welcome#services" className="mt-6 inline-flex items-center text-sm font-semibold text-primary hover:underline">
              Read More <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>

            <div className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-heading text-3xl font-extrabold gradient-text">
                    <CountUp value={s.value} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="relative overflow-hidden bg-secondary/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker mx-auto mb-4">Welcome to MediSight AI</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Premium Clinical Intelligence</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              From early risk prediction to real-time critical alerts, we help care teams act sooner and treat with precision.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc, i) => {
              const accent = ACCENTS[i % ACCENTS.length]
              return (
                <motion.div
                  key={svc.title}
                  initial={{ opacity: 0, y: 30, scale: 0.96 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                  whileHover={{ y: -6 }}
                  className={`group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow duration-300 hover:shadow-2xl ${accent.ring}`}
                >
                  <span className={`font-heading text-4xl font-extrabold ${accent.text} opacity-10 transition group-hover:opacity-20`}>{svc.num}</span>
                  <div className={`mt-2 flex h-12 w-12 items-center justify-center rounded-xl ${accent.bg} ${accent.text} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                    <svc.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-heading text-lg font-bold">{svc.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{svc.desc}</p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Meet our doctors */}
      {doctors.length > 0 && (
        <section id="doctors" className="mx-auto max-w-7xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="kicker mx-auto mb-4">Our Specialists</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Meet Our Doctors</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Board-certified specialists ready to review your AI risk screening and provide expert care.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                whileHover={{ y: -6 }}
                className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-2xl"
              >
                <div className="relative aspect-square overflow-hidden bg-secondary">
                  {doc.avatar_url ? (
                    <Image src={doc.avatar_url} alt={doc.full_name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-2xl font-bold text-white">
                      {doc.full_name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <div className="flex text-amber-400">
                      {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-3 w-3 fill-current" />)}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-heading text-sm font-bold">{doc.full_name}</h3>
                  <p className="mt-0.5 text-xs text-primary">{doc.specialty}</p>
                  {doc.consultation_fee && (
                    <p className="mt-2 text-xs text-muted-foreground">Consultation from <span className="font-semibold text-foreground">Rs. {doc.consultation_fee}</span></p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/signup" className="inline-flex items-center text-sm font-semibold text-primary hover:underline">
              View All Doctors <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <section id="testimonials" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="kicker mx-auto mb-4">Testimonials</p>
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">What They Say</h2>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border bg-card p-6 shadow-sm transition hover:shadow-premium">
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
              </div>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-white">
                  {t.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-brand" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_55%)]" />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center text-white">
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Ready to take control of your health?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/80">
            Join thousands of doctors and patients already using MediSight AI to catch risk earlier and treat with confidence.
          </p>
          <Link href="/signup" className="mt-8 inline-flex items-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
            Book Appointment <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="kicker mx-auto mb-4">Trusted &amp; Secure</p>
          <h2 className="font-heading text-3xl font-bold sm:text-4xl">Why Choose MediSight AI?</h2>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {whyChooseUs.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 text-center transition hover:-translate-y-1 hover:shadow-premium">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-heading text-base font-bold">{f.title}</h3>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <p className="kicker mx-auto mb-4">Everything You Need to Know</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">Frequently Asked Questions</h2>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((f, i) => (
              <div key={f.q} className="overflow-hidden rounded-2xl border border-border bg-card">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold"
                >
                  {f.q}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-sm leading-6 text-muted-foreground">{f.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050b1d] text-white/70">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-sm">
                  <Image src="/logo.png" alt="MediSight AI" fill className="object-cover" />
                </div>
                <span className="font-heading text-lg font-bold text-white">MediSight AI</span>
              </div>
              <p className="mt-4 text-xs leading-6">
                Enterprise healthcare decision support, built to help clinical teams predict risk earlier and treat with confidence.
              </p>
              <div className="mt-5 flex gap-3">
                {[Globe, MessageCircle, Share2, Mail].map((Icon, i) => (
                  <span key={i} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Company</h4>
              <ul className="mt-4 space-y-2.5 text-xs">
                <li><Link href="/welcome" className="hover:text-white">Home</Link></li>
                <li><a href="#services" className="hover:text-white">Services</a></li>
                <li><a href="#about" className="hover:text-white">About Us</a></li>
                <li><Link href="/login" className="hover:text-white">Sign In</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Our Services</h4>
              <ul className="mt-4 space-y-2.5 text-xs">
                {services.slice(0, 4).map((s) => <li key={s.title}>{s.title}</li>)}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white">Contact Us</h4>
              <ul className="mt-4 space-y-3 text-xs">
                <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> +92 800 987 654</li>
                <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> support@medisight.ai</li>
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> 24/7 Clinical Support</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs sm:flex-row">
            <span>© 2026 MediSight AI. All rights reserved.</span>
            <div className="flex gap-6">
              <span className="hover:text-white">Terms &amp; Conditions</span>
              <span className="hover:text-white">Privacy Policy</span>
              <Link href="/admin-portal/login" className="text-white/30 hover:text-white/60">Admin</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
