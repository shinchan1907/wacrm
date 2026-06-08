"use client";

import { useState, useRef, useCallback, KeyboardEvent, useEffect } from "react";
import { Send, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GatedButton } from "@/components/ui/gated-button";
import { useCan } from "@/hooks/use-can";
import { cn } from "@/lib/utils";
import { ReplyQuote } from "./reply-quote";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { QuickReply } from "@/types";

interface ReplyDraft {
  /** Internal UUID of the message being replied to — sent back through onSend. */
  id: string;
  authorLabel: string;
  preview: string;
}

interface MessageComposerProps {
  conversationId: string;
  sessionExpired: boolean;
  onSend: (text: string, replyToId?: string) => void;
  onOpenTemplates: () => void;
  replyTo?: ReplyDraft | null;
  onClearReply?: () => void;
}

export function MessageComposer({
  conversationId,
  sessionExpired,
  onSend,
  onOpenTemplates,
  replyTo,
  onClearReply,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Viewers (read-only role) can browse the inbox but never send.
  // For solo users this is always true — single-owner accounts pass
  // every capability — so the disabled branch is a no-op there.
  const canSend = useCan("send-messages");
  const readOnly = !canSend;
  const { accountId } = useAuth();
  const supabase = createClient();

  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [quickReplyFilter, setQuickReplyFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load quick replies
  useEffect(() => {
    if (!accountId) return;
    const fetchQuickReplies = async () => {
      const { data } = await supabase
        .from("quick_replies")
        .select("*")
        .eq("account_id", accountId)
        .order("shortcut", { ascending: true });
      if (data) setQuickReplies(data);
    };
    fetchQuickReplies();
  }, [accountId, supabase]);

  const filteredReplies = quickReplies.filter(
    (qr: QuickReply) =>
      qr.shortcut.toLowerCase().includes(quickReplyFilter.toLowerCase()) ||
      qr.content.toLowerCase().includes(quickReplyFilter.toLowerCase())
  );

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    // Max 4 lines (~96px)
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || sessionExpired) return;

    setSending(true);
    try {
      onSend(trimmed, replyTo?.id);
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } finally {
      setSending(false);
    }
  }, [text, sending, sessionExpired, onSend, replyTo?.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (showQuickReplies) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev: number) => (prev < filteredReplies.length - 1 ? prev + 1 : prev));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev: number) => (prev > 0 ? prev - 1 : 0));
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (filteredReplies.length > 0) {
            const selected = filteredReplies[selectedIndex];
            setText(selected.content);
            setShowQuickReplies(false);
            setQuickReplyFilter("");
            setTimeout(adjustHeight, 0);
          }
          return;
        }
        if (e.key === "Escape") {
          setShowQuickReplies(false);
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, showQuickReplies, filteredReplies, selectedIndex, adjustHeight]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);
      adjustHeight();

      if (val.startsWith("/")) {
        setShowQuickReplies(true);
        setQuickReplyFilter(val.slice(1));
        setSelectedIndex(0);
      } else {
        setShowQuickReplies(false);
      }
    },
    [adjustHeight]
  );

  return (
    <div className="border-t border-slate-800 bg-slate-900 p-3">
      {replyTo && (
        <div className="mb-2">
          <ReplyQuote
            authorLabel={replyTo.authorLabel}
            preview={replyTo.preview}
            onDismiss={onClearReply}
          />
        </div>
      )}
      {sessionExpired && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2">
          <p className="text-xs text-amber-400">
            24-hour session expired. Use a template to re-engage.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-400 hover:text-amber-300"
            onClick={onOpenTemplates}
          >
            <LayoutTemplate className="mr-1 h-3 w-3" />
            Templates
          </Button>
        </div>
      )}

      {/* Quick Replies Popover */}
      {showQuickReplies && filteredReplies.length > 0 && (
        <div className="absolute bottom-[calc(100%+0.5rem)] left-3 z-50 mb-1 max-h-60 w-80 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-xl">
          {filteredReplies.map((reply, index) => (
            <button
              key={reply.id}
              onClick={() => {
                setText(reply.content);
                setShowQuickReplies(false);
                setQuickReplyFilter("");
                textareaRef.current?.focus();
                setTimeout(adjustHeight, 0);
              }}
              className={cn(
                "flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left transition-colors",
                index === selectedIndex ? "bg-slate-800" : "hover:bg-slate-800/50"
              )}
            >
              <span className="font-mono text-xs font-semibold text-primary">/{reply.shortcut}</span>
              <span className="line-clamp-2 text-xs text-slate-300">{reply.content}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <GatedButton
          variant="ghost"
          size="sm"
          canAct={!readOnly}
          gateReason="send messages"
          title={readOnly ? undefined : "Send template"}
          className="h-9 w-9 shrink-0 p-0 text-slate-400 hover:text-white"
          onClick={onOpenTemplates}
        >
          <LayoutTemplate className="h-4 w-4" />
        </GatedButton>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            readOnly
              ? "Read-only — viewers can browse but not reply"
              : sessionExpired
                ? "Session expired - use a template"
                : "Type a message... (Shift+Enter for new line)"
          }
          disabled={sessionExpired || readOnly}
          rows={1}
          // Textarea keeps its own inline title — the GatedButton
          // wrapping pattern doesn't apply to non-button inputs.
          // The placeholder text also surfaces the read-only state.
          title={readOnly ? "Read-only — your role can't send messages" : undefined}
          className={cn(
            "flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-primary/50",
            (sessionExpired || readOnly) && "cursor-not-allowed opacity-50"
          )}
        />

        <GatedButton
          size="sm"
          canAct={!readOnly}
          gateReason="send messages"
          disabled={!text.trim() || sessionExpired || sending}
          onClick={handleSend}
          className="h-9 w-9 shrink-0 bg-primary p-0 hover:bg-primary/90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </GatedButton>
      </div>

      {/* Hint sits outside the flex row so its height doesn't push
          `items-end` buttons below the textarea. Indented to line up
          under the textarea left edge (w-9 button + gap-2 = 44px). */}
      <p className="mt-1 pl-11 text-[10px] text-slate-600">
        Type &apos;/&apos; for quick replies
      </p>
    </div>
  );
}
