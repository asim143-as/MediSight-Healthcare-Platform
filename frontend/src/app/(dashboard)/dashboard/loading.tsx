export default function DashboardLoading() {
  return (
    <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-6">
      <div className="loader-pulse"></div>
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-lg font-semibold text-primary tracking-wide uppercase">Processing Clinical Data</h3>
        <p className="text-sm text-muted-foreground animate-pulse">Running AI inference engine...</p>
      </div>
    </div>
  )
}
