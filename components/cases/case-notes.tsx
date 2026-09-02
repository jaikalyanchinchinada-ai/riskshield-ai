"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils/format";
import { useToast } from "@/components/ui/toast";
import { MessageSquare } from "lucide-react";

interface Note {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export function CaseNotes({ caseRef, notes }: { caseRef: string; notes: Note[] }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function submitNote() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cases/${caseRef}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, authorName: "Demo Analyst" }),
      });
      if (!res.ok) throw new Error();
      setContent("");
      toast("Note added", "success");
      router.refresh();
    } catch {
      toast("Could not add the note. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Textarea
          placeholder="Add an investigation note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[70px]"
        />
      </div>
      <Button size="sm" onClick={submitNote} loading={submitting} disabled={!content.trim()}>
        Add Note
      </Button>

      <div className="space-y-3 pt-2">
        {notes.length === 0 ? (
          <p className="text-sm text-canvas-muted flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" /> No notes yet.
          </p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="rounded-lg bg-slate-50 border border-canvas-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-700">{note.authorName}</span>
                <span className="text-xs text-canvas-muted">{formatRelativeTime(note.createdAt)}</span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
