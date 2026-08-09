"use client"

import { useEffect, useState, Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { PatientSidebar } from "@/components/layout/PatientSidebar"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

function PortalErrorBanner() {
  const searchParams = useSearchParams()
  const portalError = searchParams.get("error")
  const [dismissed, setDismissed] = useState(false)

  if (!portalError || dismissed) return null

  return (
    <div className="mx-auto mb-6 max-w-7xl rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-3">
      <span>{portalError}</span>
      <button onClick={() => setDismissed(true)} className="text-destructive/70 hover:text-destructive">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background/50">
      <div className="hidden lg:flex lg:w-72 lg:flex-none">
        <PatientSidebar />
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
            >
              <PatientSidebar onClose={() => setMobileMenuOpen(false)} className="rounded-r-2xl border-r-0 shadow-2xl" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 shadow-sm backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-muted-foreground">Patient Portal</span>
        </header>

        <main className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6 lg:p-8 relative">
          <Suspense fallback={null}>
            <PortalErrorBanner />
          </Suspense>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full w-full max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
