"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, RotateCcw, Sparkles, ArrowRight, Clock, Bot } from "lucide-react";
import { QUIZ_STEPS } from "@/lib/expo/quiz";
import type { BoothCategory } from "@/lib/expo/booths";
import { recommendBooths, totalMinutes, reasonFor } from "@/lib/expo/recommend";
import { BoothThumb } from "@/components/expo/booth-thumb";
import { useExpoStore } from "@/stores/expo-store";
import { toast } from "sonner";

export default function HomePage() {
  const router = useRouter();
  const { addManyToItinerary } = useExpoStore();
  const [step, setStep] = useState(0);
  const [tags, setTags] = useState<BoothCategory[]>([]);
  const done = step >= QUIZ_STEPS.length;

  const recs = useMemo(() => recommendBooths(tags, 4), [tags]);
  const mins = totalMinutes(recs);

  const answer = (opt: BoothCategory[]) => {
    setTags((t) => [...t, ...opt]);
    setStep((s) => s + 1);
  };
  const reset = () => {
    setTags([]);
    setStep(0);
  };

  const addAll = () => {
    addManyToItinerary(recs.map((b) => b.id));
    toast.success("已按推荐顺序加入行程");
    router.push("/crowd");
  };

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col bg-secondary pb-24 lg:min-h-[calc(100vh-76px)] lg:max-w-none lg:pb-10">
      <div
        className="relative mx-3 mt-3 overflow-hidden rounded-[28px] px-5 pb-8 pt-7 text-white lg:mx-8 lg:mt-8 lg:rounded-[32px] lg:px-10 lg:pb-14 lg:pt-12"
        style={{
          background: "linear-gradient(145deg,#0b3525 0%,#164c34 100%)",
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full border border-lime-300/15 bg-lime-300/5 lg:right-14 lg:top-[-90px] lg:size-80" />
        <div className="pointer-events-none absolute right-5 top-8 flex size-20 rotate-[-8deg] items-center justify-center rounded-[24px] border-4 border-white/90 bg-[#0b3525]/70 shadow-lg lg:right-14 lg:top-7 lg:size-28 lg:rounded-[34px] lg:border-[7px]">
          <Bot className="size-11 text-primary lg:size-16" />
        </div>
        <div className="flex items-center gap-2 text-sm/none opacity-90">
          <Sparkles className="size-4" /> 智能展会导览
        </div>
        <h1 className="mt-3 max-w-[72%] text-2xl font-bold leading-tight lg:mt-5 lg:max-w-none lg:text-4xl lg:leading-tight">
          先答几道题
          <br />
          让 AI 帮你排好逛展路线
        </h1>
        <p className="mt-2 max-w-[72%] text-sm opacity-85 lg:mt-3 lg:max-w-none lg:text-base">
          更聪明的逛展体验 · 两小时逛遍精彩
        </p>
      </div>

      <div className="relative z-10 -mt-4 flex-1 rounded-t-3xl bg-secondary px-4 pt-5 lg:mx-auto lg:-mt-8 lg:w-[calc(100%-8rem)] lg:max-w-6xl lg:flex-none lg:rounded-3xl lg:border lg:border-border lg:bg-card lg:p-8 lg:shadow-xl">
        {!done ? (
          <QuizCard key={step} index={step} onAnswer={answer} />
        ) : (
          <div data-el="recommend-result">
            <div className="mb-3 flex items-center justify-between lg:mb-5">
              <div>
                <div className="text-sm font-semibold lg:text-xl">为你推荐的重点展位</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground lg:mt-1 lg:text-sm">
                  <Clock className="size-3" /> 共 {recs.length} 个 · 约 {mins} 分钟
                </div>
              </div>
              <button
                onClick={reset}
                data-el="quiz-reset"
                className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground active:bg-secondary"
              >
                <RotateCcw className="size-3" /> 重答
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-border bg-accent/60 p-3 text-xs text-secondary-foreground lg:mb-5 lg:p-4 lg:text-sm">
              {reasonFor(tags)}
            </div>

            <div className="grid gap-2.5 lg:grid-cols-2 lg:gap-4">
              {recs.map((b, i) => (
                <Link
                  key={b.id}
                  href={`/booths/${b.id}`}
                  data-el="recommend-item"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md active:scale-[.99] lg:p-4"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <BoothThumb booth={b} className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {b.id} {b.name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {b.zone} · 推荐 {b.recommendMinutes} 分钟
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>

            <button
              onClick={addAll}
              data-el="add-all-to-trip"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow transition-all hover:bg-primary/90 active:scale-[.99] lg:ml-auto lg:mt-6 lg:max-w-xs"
            >
              <Check className="size-4" /> 一键加入行程
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizCard({
  index,
  onAnswer,
}: {
  index: number;
  onAnswer: (tags: BoothCategory[]) => void;
}) {
  const s = QUIZ_STEPS[index];
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={s.id}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        data-el="quiz-card"
      >
        <div className="mb-3 flex items-center gap-1.5">
          {QUIZ_STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${
                i <= index ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-8">
          <div className="text-xs text-muted-foreground">
            第 {index + 1} / {QUIZ_STEPS.length} 题
          </div>
          <h2 className="mt-1 text-lg font-semibold lg:mt-2 lg:text-2xl">{s.question}</h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:mt-7 lg:grid-cols-3 lg:gap-4">
            {s.options.map((o) => (
              <button
                key={o.label}
                onClick={() => onAnswer(o.tags)}
                data-el="quiz-option"
                className="flex min-h-24 flex-col items-start gap-1 rounded-xl border border-border bg-secondary p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent hover:shadow-sm active:border-primary active:bg-accent lg:min-h-32 lg:p-5"
              >
                <span className="text-2xl lg:text-3xl">{o.emoji}</span>
                <span className="text-sm font-medium lg:mt-2 lg:text-base">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          点选答案进入下一题 →
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
