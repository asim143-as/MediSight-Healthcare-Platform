"use client"

import Link from "next/link"
import { Phone, Mail, Clock, MapPin, Send, MessageSquare, ShieldCheck } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact MediSight Support & Clinical Operations</h1>
        <p className="text-sm text-muted-foreground mt-1">Get in touch with our technical team, medical advisors, or hospital system administrators.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info Cards */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-base border-b pb-2">Support Channels</h3>
            
            <div className="flex items-start gap-3 text-sm">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-xs">Email Us</p>
                <p className="text-xs text-muted-foreground">support@medisight.ai</p>
                <p className="text-[10px] text-muted-foreground">Response within 2 hours</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-xs">Emergency Helpline</p>
                <p className="text-xs text-muted-foreground">+1 (800) 700-6200</p>
                <p className="text-[10px] text-muted-foreground">24/7 Priority Clinical Support</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-xs">Headquarters</p>
                <p className="text-xs text-muted-foreground">MediSight Medical Plaza, Suite 400</p>
                <p className="text-[10px] text-muted-foreground">San Francisco, CA 94107</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <ShieldCheck className="h-4 w-4" /> HIPAA Compliant Channel
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              All communications sent through our portal are encrypted and compliant with patient data protection standards.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="rounded-xl border bg-card p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold">Send a Message</h3>
          </div>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  placeholder="Dr. John Doe"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Work Email</label>
                <input
                  type="email"
                  placeholder="doctor@hospital.org"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Department / Facility</label>
                <input
                  type="text"
                  placeholder="Cardiology / Central Hospital"
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Inquiry Subject</label>
                <select className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>Clinical AI Model Access</option>
                  <option>EHR / Supabase Integration Query</option>
                  <option>Emergency Escalation</option>
                  <option>General Support</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea
                rows={5}
                placeholder="Describe your request or technical issue..."
                className="w-full p-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <button type="submit" className="uiverse-btn w-full sm:w-auto">
              <Send className="mr-2 h-4 w-4" /> Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
