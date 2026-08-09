"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, Stethoscope, Users, ShieldCheck, UserCircle, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const NAV = [
  { href: "/admin-portal/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin-portal/doctors", label: "Manage Doctors", icon: Stethoscope },
  { href: "/admin-portal/patients", label: "Manage Patients", icon: Users },
  { href: "/admin-portal/account", label: "My Account", icon: UserCircle },
]

export function AdminPortalSidebar({ adminName }: { adminName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/admin-portal/login")
  }

  return (
    <aside className="flex h-full w-72 flex-none flex-col border-r border-red-500/10 bg-[#0a0505] text-white">
      <div className="flex items-center gap-2.5 border-b border-red-500/10 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/15 text-red-500">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <p className="font-heading text-sm font-bold">Admin Console</p>
          <p className="text-xs text-white/40">{adminName || "Super Admin"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                active ? "bg-red-600/15 text-red-400" : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-red-500/10 px-4 py-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 transition hover:bg-red-600/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </div>
    </aside>
  )
}
