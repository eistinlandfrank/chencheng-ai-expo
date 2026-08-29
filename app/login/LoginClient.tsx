'use client';

import { useState } from 'react';
import Link from 'next/link';
import { startAuthentication } from '@simplewebauthn/browser';
import { KeyRound, ShieldCheck } from 'lucide-react';
import Brand from '@/components/Brand';

export default function LoginClient({ returnTo }: { returnTo: string }) {
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function login() {
    setWorking(true);
    setMessage('');
    try {
      const optionsResponse = await fetch('/api/v1/auth/login/options', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      const optionsPayload = await optionsResponse.json() as { options?: unknown; message?: string };
      if (!optionsResponse.ok || !optionsPayload.options) throw new Error(optionsPayload.message ?? '暂时无法登录，请稍后重试');
      const credential = await startAuthentication({
        optionsJSON: optionsPayload.options as Parameters<typeof startAuthentication>[0]['optionsJSON'],
      });
      const verifyResponse = await fetch('/api/v1/auth/login/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ response: credential }),
      });
      const verifyPayload = await verifyResponse.json() as { message?: string };
      if (!verifyResponse.ok) throw new Error(verifyPayload.message ?? '未能验证通行密钥，请重新尝试');
      window.location.assign(returnTo);
    } catch (error) {
      setMessage(error instanceof Error && error.name !== 'NotAllowedError'
        ? error.message
        : '登录已取消，您可以重新尝试');
      setWorking(false);
    }
  }

  return (
    <main className="access-page auth-page">
      <section>
        <Brand />
        <span className="auth-icon"><KeyRound size={24} /></span>
        <h1>登录 Expo Service AI</h1>
        <p>参展商与场馆工作人员请使用受邀账号登录。</p>
        <button className="primary-wide" type="button" disabled={working} onClick={login}>
          {working ? '正在验证…' : '使用通行密钥登录'}
        </button>
        {message && <p className="auth-message" role="alert" aria-live="assertive">{message}</p>}
        <div className="auth-secondary"><Link href="/activate">激活受邀账号</Link><Link href="/">返回观众端</Link></div>
        <small className="auth-assurance"><ShieldCheck size={15} />通行密钥由您的设备安全保存</small>
      </section>
    </main>
  );
}
