'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react';
import Brand from '@/components/Brand';
import PortalSwitcher, { type PortalId } from '@/components/PortalSwitcher';

export default function LoginClient({ returnTo, activePortal }: { returnTo: string; activePortal: PortalId }) {
  const [working, setWorking] = useState<'password' | 'passkey' | null>(null);
  const [message, setMessage] = useState('');

  async function passwordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking('password');
    setMessage('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/v1/auth/password/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? '账号或密码不正确');
      window.location.assign(returnTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '暂时无法登录，请稍后重试');
      setWorking(null);
    }
  }

  async function passkeyLogin() {
    setWorking('passkey');
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
      setWorking(null);
    }
  }

  const portalName = activePortal === 'operations' ? '场馆运营端' : '展商端';
  const portalDescription = activePortal === 'operations'
    ? '场馆工作人员请使用受邀账号登录。'
    : '参展商请使用受邀账号登录。';

  return (
    <main className="access-page auth-page">
      <section>
        <Brand />
        <span className="auth-icon"><KeyRound size={24} /></span>
        <h1>登录{portalName}</h1>
        <p>{portalDescription}</p>
        <PortalSwitcher activePortal={activePortal} />
        <form className="auth-form auth-login-form" onSubmit={passwordLogin}>
          <label>
            <span>账号邮箱</span>
            <input name="email" type="email" autoComplete="username" maxLength={254} required />
          </label>
          <label>
            <span>密码</span>
            <input name="password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required />
          </label>
          <button className="primary-wide" type="submit" disabled={working !== null}>
            <KeyRound size={17} aria-hidden="true" />
            {working === 'password' ? '正在登录…' : '账号密码登录'}
          </button>
        </form>
        {message && <p className="auth-message" role="alert" aria-live="assertive">{message}</p>}
        <div className="auth-divider"><span>其他登录方式</span></div>
        <button className="auth-passkey-button" type="button" disabled={working !== null} onClick={passkeyLogin}>
          <Fingerprint size={17} aria-hidden="true" />
          {working === 'passkey' ? '正在验证…' : '使用通行密钥登录'}
        </button>
        <div className="auth-secondary"><Link href="/activate">激活受邀账号</Link></div>
        <small className="auth-assurance"><ShieldCheck size={15} />登录信息经加密连接传输，密码不会明文保存</small>
      </section>
    </main>
  );
}
