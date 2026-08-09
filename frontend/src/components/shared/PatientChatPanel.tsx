"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Bot, Send, User, Loader2, CalendarPlus } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_PROMPTS = [
  "I've had a headache and dizziness for two days.",
  "What kind of doctor should I see for joint pain?",
  "I have a mild fever and sore throat — what should I do?",
]

function generateLocalFallback(message: string): string {
  const q = message.toLowerCase()
  if (q.includes("chest pain") || q.includes("breath") || q.includes("stroke") || q.includes("bleeding")) {
    return "🚨 **This could be an emergency.** Please seek immediate medical attention or call your local emergency number right now — don't wait on a chat response.\n\nThis assistant does not replace professional medical advice."
  }
  return "👋 I'm the MediSight Patient Assistant. Tell me a bit about your symptoms — how long you've had them and how they feel — and I'll suggest which specialist to book with.\n\nI can't diagnose you or run clinical predictions; a doctor handles that once you're booked in.\n\n(Note: the AI service isn't reachable right now, so this is a general fallback response.)"
}

export function PatientChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi, I'm your **MediSight Patient Assistant**. Tell me what symptoms you're experiencing and I'll help point you to the right kind of doctor and get you booked in.\n\nI don't diagnose conditions or replace professional medical advice — for anything urgent, please seek emergency care right away."
    }
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: text }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const recentHistory = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
      let reply: string | null = null
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, history: recentHistory, mode: "patient" }),
        })
        if (res.ok) {
          const data = await res.json()
          reply = data.reply
        }
      } catch {
        // fall through to local fallback
      }
      if (!reply) reply = generateLocalFallback(text)

      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: reply! }])
    } finally {
      setIsLoading(false)
    }
  }

  const renderContent = (content: string) =>
    content.split("\n").map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g)
      return (
        <span key={i}>
          {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
          <br />
        </span>
      )
    })

  return (
    <Card className="flex flex-col h-[700px] border shadow-sm">
      <CardHeader className="border-b bg-muted/20 pb-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle>MediSight Patient Assistant</CardTitle>
        </div>
        <CardDescription>Symptom guidance and specialist recommendations — not a diagnosis.</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 max-w-[88%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
            <div className={`flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </div>
            <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {renderContent(msg.content)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[80%] mr-auto">
            <div className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-secondary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="px-4 py-3 rounded-xl bg-muted flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              className="rounded-full border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <CardFooter className="border-t p-3 flex flex-col gap-2">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(input) }}
          className="flex w-full items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe how you're feeling..."
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <Link href="/patient/appointments/book" className="w-full">
          <Button variant="outline" className="w-full gap-2" type="button">
            <CalendarPlus className="h-4 w-4" />
            Book an Appointment
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
