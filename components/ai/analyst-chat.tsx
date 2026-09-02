"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  source?: "llm" | "fallback_template";
}

const SUGGESTIONS = [
  "What are the major risk patterns?",
  "Show me the highest risk transactions today",
  "Why was TXN-100045 flagged?",
];

export function AnalystChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send(question: string) {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const json = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: json.answer ?? "No answer available.", source: json.source }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong reaching the analyst. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/40 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all duration-200"
        style={{ width: 52, height: 52 }}
        aria-label="Open RiskShield Analyst"
      >
        {!open && (
          <span className="absolute inset-0 rounded-full bg-brand-500 animate-ping opacity-30" style={{ animationDuration: "2.5s" }} />
        )}
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed bottom-36 md:bottom-24 right-5 z-40 w-[340px] max-w-[calc(100vw-2.5rem)] h-[440px] bg-white rounded-xl shadow-2xl border border-canvas-border flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-canvas-border bg-surface text-white">
            <Sparkles className="h-4 w-4 text-brand-400" />
            <div>
              <p className="text-sm font-semibold leading-none">RiskShield Analyst</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ask about any transaction or risk pattern</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-canvas-muted flex items-center gap-1.5">
                  <ShieldQuestion className="h-3.5 w-3.5" /> Try asking:
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg px-3 py-2 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm rounded-lg px-3 py-2 max-w-[85%] whitespace-pre-wrap",
                  m.role === "user" ? "bg-brand-500 text-white ml-auto" : "bg-slate-100 text-slate-700"
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && <div className="text-xs text-canvas-muted px-1">RiskShield Analyst is thinking...</div>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-canvas-border p-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="flex-1 rounded-lg border border-canvas-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
