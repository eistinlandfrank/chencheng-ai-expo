'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { startRegistration } from '@simplewebauthn/browser';
import { KeyRound, ShieldCheck } from 'lucide-react';
import Brand from '@/components/Brand';

export default function ActivateClient() {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const optionsResponse = await fetch('/api/v1/auth/activate/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email') ?? ''), code: String(form.get('code') ?? '') }),
      });
      const optionsPayload = await optionsResponse.json() as { options?: unknown; message?: string };
      if (!optionsResponse.ok || !optionsPayload.options) throw new Error(optionsPayload.message ?? '邮箱或激活码无效');
      const credential = await startRegistration({
        optionsJSON: optionsPayload.options as Parameters<typeof startRegistration>[0]['optionsJSON'],
      });
      const verifyResponse = await fetch('/api/v1/auth/activate/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ response: credential }),
      });
      const verifyPayload = await verifyResponse.json() as { destination?: string; message?: string };
      if (!verifyResponse.ok) throw new Error(verifyPayload.message ?? '账号激活失败，请重新尝试');
      window.location.assign(verifyPayload.destination ?? '/');
    } catch (error) {
      setMessage(error instanceof Error && error.name !== 'NotAllowedError'
        ? error.message
        : '激活已取消，您可以重新尝试');
      setWorking(false);
    }
  }

  return (
    <main className="access-page auth-page">
      <section>
        <Brand />
        <span className="auth-icon"><KeyRound size={24} /></span>
        <h1>激活受邀账号</h1>
        <p>输入邀请邮箱和激活码，然后在当前设备上创建通行密钥。</p>
        <form className="auth-form" onSubmit={activate}>
          <label><span>邀请邮箱</span><input name="email" type="email" autoComplete="email" required /></label>
          <label><span>激活码</span><input name="code" type="text" autoComplete="one-time-code" minLength={16} required /></label>
          <button className="primary-wide" type="submit" disabled={working}>{working ? '正在激活…' : '创建通行密钥'}</button>
        </form>
        {message && <p className="auth-message" role="alert" aria-live="assertive">{message}</p>}
        <div className="auth-secondary"><Link href="/login">返回登录</Link><Link href="/">返回观众端</Link></div>
        <small className="auth-assurance"><ShieldCheck size={15} />激活码仅可使用一次，并会在短时间后失效</small>
      </section>
    </main>
  );
}
