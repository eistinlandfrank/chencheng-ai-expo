"use client";

import { useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { PageShell } from "@/components/shell/page-shell";
import { askAssistant } from "@/lib/api";
import { AppAIClientUnavailableError } from "@/lib/api/app-ai-request";

interface Msg {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTED = [
  "市场展会区怎么走？",
  "机器人展区的背景信息是什么？",
  "我怎么导航过去？",
  "展会有什么福利？",
  "现场开到几点？",
];

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text: "你好！我是展会智能助手，可以回答现场路线、展区背景、开放时间、福利等各种问题。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () =>
    requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }),
    );

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    const history = msgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.text }));
    setMsgs((m) => [...m, { role: "user", text }]);
    setLoading(true);
    scrollDown();
    try {
      const reply = await askAssistant(text, history);
      setMsgs((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      const msg =
        e instanceof AppAIClientUnavailableError
          ? "AI 功能暂时不可用，请稍后再试。"
          : "抱歉，暂时无法回答，请稍后再试。";
      setMsgs((m) => [...m, { role: "assistant", text: msg }]);
    } finally {
      setLoading(false);
      scrollDown();
    }
  };

  return (
    <PageShell title="AI 智能助手" subtitle="现场随便问，我来帮你答" noPadBottom>
      <div className="flex h-[calc(100dvh-128px)] flex-col lg:mx-8 lg:mb-8 lg:mt-6 lg:h-[calc(100vh-206px)] lg:overflow-hidden lg:rounded-3xl lg:border lg:border-border lg:bg-card lg:shadow-sm xl:mx-auto xl:max-w-6xl">
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4 lg:px-10 lg:py-8"
          data-el="assistant-messages"
        >
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="mr-2 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="size-4" />
                </div>
              )}
              <div
                className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 lg:max-w-[65%] lg:px-4 lg:py-3 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-secondary-foreground"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="mr-2 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div className="rounded-2xl border border-border bg-card px-3.5 py-3">
                <span className="inline-flex gap-1">
                  <i className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-.2s]" />
                  <i className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-.1s]" />
                  <i className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* suggestions */}
        <div className="border-t border-border bg-secondary px-4 pt-2.5 lg:px-10 lg:pt-4">
          <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" /> 试试这些问题
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-4" data-el="assistant-suggestions">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-secondary-foreground active:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* input */}
        <div
          className="flex items-center gap-2 border-t border-border bg-card px-4 pb-[max(12px,env(safe-area-inset-bottom,0px))] pt-3 lg:px-10 lg:py-5"
          data-el="assistant-input"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="输入你的问题…"
            className="flex-1 rounded-full border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            aria-label="发送"
          >
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </PageShell>
  );
}
