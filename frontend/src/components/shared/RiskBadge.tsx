import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type RiskSeverity = 'Low' | 'Moderate' | 'High' | 'Critical' | 'Unknown'

export function RiskBadge({ severity, className }: { severity: RiskSeverity | string, className?: string }) {
  const safeSeverity = ['Low', 'Moderate', 'High', 'Critical'].includes(severity) ? (severity as RiskSeverity) : 'Unknown'
  
  const colorMap: Record<RiskSeverity | 'Unknown', string> = {
    Low: "bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/30 dark:text-green-400",
    Moderate: "bg-amber-100 text-amber-800 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400",
    High: "bg-orange-100 text-orange-800 hover:bg-orange-100/80 dark:bg-orange-900/30 dark:text-orange-400",
    Critical: "bg-red-100 text-red-800 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-400 font-bold",
    Unknown: "bg-gray-100 text-gray-800 hover:bg-gray-100/80 dark:bg-gray-800 dark:text-gray-400",
  }

  return (
    <Badge variant="outline" className={cn("border-transparent", colorMap[safeSeverity], className)}>
      {severity}
    </Badge>
  )
}
