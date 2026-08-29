import { NextRequest, NextResponse } from 'next/server';
import { requestNetworkAddress } from '@/app/auth';
import {
  aiAssistantConfiguration,
  assistantRequestAllowed,
  assistantSystemPrompt,
  assistantTextFromCompletion,
} from '@/lib/ai-assistant';

const MAX_QUESTION_LENGTH = 500;

function requestOriginMatchesApp(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(process.env.APP_ORIGIN ?? '').origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  if (!requestOriginMatchesApp(request)) {
    return NextResponse.json({ code: 'ORIGIN_FORBIDDEN', message: '请求来源无效', request_id: requestId, details: null }, { status: 403 });
  }

  const clientAddress = requestNetworkAddress(request);
  if (!assistantRequestAllowed(clientAddress)) {
    return NextResponse.json({ code: 'RATE_LIMITED', message: '提问过于频繁，请稍后再试', request_id: requestId, details: null }, { status: 429 });
  }

  let payload: { question?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', message: '请求内容格式不正确', request_id: requestId, details: null }, { status: 400 });
  }

  const question = typeof payload.question === 'string' ? payload.question.trim().slice(0, MAX_QUESTION_LENGTH) : '';
  if (!question) {
    return NextResponse.json({ code: 'QUESTION_REQUIRED', message: '请输入想咨询的问题', request_id: requestId, details: null }, { status: 422 });
  }

  const { apiKey, baseUrl, model } = aiAssistantConfiguration();
  if (!apiKey) {
    return NextResponse.json({ code: 'ASSISTANT_UNAVAILABLE', message: '展会助手暂不可用，请稍后再试', request_id: requestId, details: null }, { status: 503 });
  }

  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl}/chat/completions`);
    if (endpoint.protocol !== 'https:') throw new Error('insecure_protocol');
  } catch {
    console.error('AI assistant configuration has an invalid base URL');
    return NextResponse.json({ code: 'ASSISTANT_UNAVAILABLE', message: '展会助手暂不可用，请稍后再试', request_id: requestId, details: null }, { status: 503 });
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 320,
        messages: [
          { role: 'system', content: assistantSystemPrompt },
          { role: 'user', content: question },
        ],
      }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!upstream.ok) {
      console.warn(`AI assistant upstream request failed with status ${upstream.status}`);
      return NextResponse.json({ code: 'ASSISTANT_UNAVAILABLE', message: '展会助手暂不可用，请稍后再试', request_id: requestId, details: null }, { status: 503 });
    }

    const answer = assistantTextFromCompletion(await upstream.json());
    if (!answer) {
      console.warn('AI assistant upstream returned no text');
      return NextResponse.json({ code: 'ASSISTANT_UNAVAILABLE', message: '展会助手暂不可用，请稍后再试', request_id: requestId, details: null }, { status: 503 });
    }

    return NextResponse.json({ request_id: requestId, answer: answer.slice(0, 1_200) });
  } catch (error) {
    const label = error instanceof Error ? error.name : 'unknown';
    console.warn(`AI assistant upstream request failed: ${label}`);
    return NextResponse.json({ code: 'ASSISTANT_UNAVAILABLE', message: '展会助手暂不可用，请稍后再试', request_id: requestId, details: null }, { status: 503 });
  }
}
