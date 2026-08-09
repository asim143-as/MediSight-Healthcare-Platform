"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Settings, LogOut, Bell, Bot, ShieldCheck, BarChart3, User, Stethoscope, Mail, ChevronRight, Calendar } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface DashboardSidebarProps {
  onClose?: () => void
  className?: string
}

export function DashboardSidebar({ onClose, className }: DashboardSidebarProps) {
  const pathname = usePathname()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const [isAdmin, setIsAdmin] = useState(false)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
          if (data) {
            setRole(data.role)
            // super_admin now has a fully separate portal (/admin-portal) —
            // only hospital_admin/data_scientist still use the panel embedded
            // here (model registry, MLOps, audit logs).
            setIsAdmin(['hospital_admin', 'data_scientist'].includes(data.role))
          }
        })
      }
    })
  }, [])

  const navGroups = [
    {
      title: "Clinical",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Patients", href: "/patients", icon: Users },
        { name: "Appointments", href: "/appointments", icon: Calendar },
        { name: "Doctors", href: "/doctors", icon: Stethoscope },
        { name: "Alerts Center", href: "/alerts", icon: Bell },
        { name: "AI Assistant", href: "/assistant", icon: Bot },
      ]
    },
    {
      title: "Management",
      items: [
        { name: "Analytics", href: "/analytics", icon: BarChart3 },
        ...(isAdmin ? [{ name: "Admin Console", href: "/admin", icon: ShieldCheck }] : []),
      ]
    },
    {
      title: "System",
      items: [
        { name: "About Us", href: "/about", icon: User },
        { name: "Contact", href: "/contact", icon: Mail },
        { name: "Settings", href: "/settings", icon: Settings },
      ]
    }
  ]

  return (
    <motion.div 
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn("flex h-full w-full flex-col border-r bg-card/95 backdrop-blur-xl shadow-lg", className)}
    >
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => onClose?.()}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
            <span className="text-[11px] font-bold text-white tracking-wider">MAI</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">MediSight AI</span>
        </Link>
      </div>
      
      {role && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="border-b px-6 py-3.5 bg-muted/20"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {role === 'doctor' ? 'Doctor Portal' : role === 'patient' ? 'Patient Portal' : 'Admin Console'}
            </span>
          </div>
        </motion.div>
      )}
      
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        <nav className="grid gap-6 px-4">
          {navGroups.map((group, groupIdx) => {
            if (group.items.length === 0) return null;
            return (
              <motion.div 
                key={group.title}
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 + (groupIdx * 0.05) }}
                className="space-y-1"
              >
                <h4 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2">
                  {group.title}
                </h4>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onClose?.()}
                      className={cn(
                        "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                          : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("h-4 w-4 transition-transform duration-300", isActive ? "scale-110" : "group-hover:scale-110 group-hover:text-primary")} />
                        <span>{item.name}</span>
                      </div>
                      {isActive && (
                        <motion.div 
                          layoutId="activeIndicator" 
                          className="absolute left-0 w-1 h-6 bg-white rounded-r-md"
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  )
                })}
              </motion.div>
            )
          })}
        </nav>
      </div>
      
      <div className="border-t p-4 bg-muted/10">
        <button
          onClick={handleLogout}
          className="group flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold text-muted-foreground transition-all duration-300 hover:bg-destructive/10 hover:text-destructive hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-4.5 w-4.5 transition-transform group-hover:-translate-x-1" />
            <span>Secure Logout</span>
          </div>
        </button>
      </div>
    </motion.div>
  )
}


