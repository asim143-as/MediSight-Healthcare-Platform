"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Users, Brain, Activity, ScrollText, Stethoscope } from "lucide-react"

const tabs = [
  { name: "User Management", href: "/admin/users", icon: Users },
  { name: "Doctor Verification", href: "/admin/doctors", icon: Stethoscope },
  { name: "Model Registry", href: "/admin/models", icon: Brain },
  { name: "Drift & MLOps", href: "/admin/mlops", icon: Activity },
  { name: "Audit Logs", href: "/admin/audit", icon: ScrollText },
]

export function AdminTabs() {
  const pathname = usePathname()
  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 -mb-px">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
