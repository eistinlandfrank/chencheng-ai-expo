import { type NextRequest, NextResponse } from "next/server";
import {
  createChatCompletion,
  AIProviderUnavailableError,
} from "@/lib/ai-provider";
import { CATEGORY_LABEL } from "@/lib/expo/booths";
import { ACTIVE_BOOTHS as BOOTHS } from "@/lib/expo/DATA_SOURCE";

const BOOTH_CONTEXT = BOOTHS.map(
  (b) => `${b.id} ${b.name}（${CATEGORY_LABEL[b.category]}，${b.zone}）`,
).join("；");

const SYSTEM_PROMPT = `你是展会观众端的智能助手，用简体中文、简洁友好地回答问题。
你只能参考下面的展位目录介绍展位名称、类别和标注区域。不要编造开放时间、活动、福利、实时人流、展位状态、路线、距离或步行时间。
当前地图属于界面示意，不能当作已核验导航；遇到路线、无障碍通行或现场状态问题，应明确建议观众查看主办方最新公告、现场标识或咨询服务台。
以下是当前展位目录（编号 名称（类别，标注区域））：
${BOOTH_CONTEXT}
回答保持在 3 句话以内；目录里没有的信息要直接说明无法确认。`;

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX_REQUESTS = 20;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const current = requestBuckets.get(ip);
  if (!current || current.resetAt <= now) {
    requestBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_MAX_REQUESTS;
}

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request))) {
    return NextResponse.json(
      { error: "too many requests" },
      { status: 429, headers: { "Retry-After": "300" } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
    history?: ChatMsg[];
  };
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "empty question" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json({ error: "question too long" }, { status: 400 });
  }

  const history = Array.isArray(body.history)
    ? body.history
        .filter(
          (message): message is ChatMsg =>
            (message?.role === "user" || message?.role === "assistant") &&
            typeof message.content === "string",
        )
        .slice(-6)
        .map((message) => ({ ...message, content: message.content.slice(0, 1000) }))
    : [];

  try {
    const result = await createChatCompletion([
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ]);
    const reply =
      result.choices?.[0]?.message?.content?.trim() ||
      "抱歉，我暂时没有找到答案，你可以去服务台或「地图」页看看。";
    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof AIProviderUnavailableError) {
      return NextResponse.json(
        { code: "ai_provider_unavailable", message: error.message },
        { status: 503 },
      );
    }
    throw error;
  }
}
