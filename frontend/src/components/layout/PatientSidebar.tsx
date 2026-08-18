"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, CalendarPlus, CalendarClock, Bot, User, LogOut } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { motion } from "framer-motion"

interface PatientSidebarProps {
  onClose?: () => void
  className?: string
}

export function PatientSidebar({ onClose, className }: PatientSidebarProps) {
  const pathname = usePathname()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const navItems = [
    { name: "Overview", href: "/patient/dashboard", icon: LayoutDashboard },
    { name: "Book Appointment", href: "/patient/appointments/book", icon: CalendarPlus },
    { name: "My Appointments", href: "/patient/appointments", icon: CalendarClock },
    { name: "AI Assistant", href: "/patient/assistant", icon: Bot },
    { name: "Profile", href: "/patient/profile", icon: User },
  ]

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn("flex h-full w-full flex-col border-r bg-card/95 backdrop-blur-xl shadow-lg", className)}
    >
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/patient/dashboard" className="flex items-center gap-3 group" onClick={() => onClose?.()}>
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg shadow-md group-hover:scale-105 transition-transform">
            <Image src="/logo.png" alt="MediSight AI Logo" fill className="object-cover" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">MediSight AI</span>
        </Link>
      </div>

      <div className="border-b px-6 py-3.5 bg-muted/20">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Patient Portal
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        <nav className="grid gap-1 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onClose?.()}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-primary")} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t p-4 bg-muted/10">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm"
        >
          <LogOut className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-1" />
          <span>Secure Logout</span>
        </button>
      </div>
    </motion.div>
  )
}
