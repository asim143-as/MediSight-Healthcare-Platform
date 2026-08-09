import { PatientChatPanel } from "@/components/shared/PatientChatPanel"

export default function PatientAssistantPage() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground">Describe your symptoms and get pointed to the right specialist.</p>
      </div>
      <PatientChatPanel />
    </div>
  )
}
