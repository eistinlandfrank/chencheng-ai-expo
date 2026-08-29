import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextRequest, NextResponse } from 'next/server';
import {
  authConfiguration,
  csrfMatches,
  sessionForToken,
  type AuthSession,
  type AuthUser,
} from '@/db/auth';

const secureCookies = process.env.NODE_ENV === 'production';
export const SESSION_COOKIE = secureCookies ? '__Host-expo_session' : 'expo_session';
export const CSRF_COOKIE = secureCookies ? '__Host-expo_csrf' : 'expo_csrf';
export const CHALLENGE_COOKIE = secureCookies ? '__Host-expo_auth_challenge' : 'expo_auth_challenge';

export type { AuthSession, AuthUser };

export async function getAuthSession() {
  const cookieStore = await cookies();
  return sessionForToken(cookieStore.get(SESSION_COOKIE)?.value ?? '');
}

export async function getRequestAuthSession(request: NextRequest) {
  return sessionForToken(request.cookies.get(SESSION_COOKIE)?.value ?? '');
}

export async function getUser() {
  return (await getAuthSession())?.user ?? null;
}

export async function requireUser(returnTo: string) {
  const user = await getUser();
  if (user) return user;
  redirect(loginPath(returnTo));
}

export function loginPath(returnTo = '/') {
  return `/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function safeReturnPath(value: string) {
  if (!value.startsWith('/') || value.startsWith('//')) return '/';
  try {
    const parsed = new URL(value, 'https://app.local');
    if (parsed.origin !== 'https://app.local') return '/';
    if (['/login', '/activate'].includes(parsed.pathname) || parsed.pathname.startsWith('/api/')) return '/';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/';
  }
}

export function setSessionCookies(response: NextResponse, result: { token: string; csrfToken: string; expiresAt: string }) {
  const expires = new Date(result.expiresAt);
  response.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    expires,
  });
  response.cookies.set(CSRF_COOKIE, result.csrfToken, {
    httpOnly: false,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/', maxAge: 0 });
  response.cookies.set(CSRF_COOKIE, '', { httpOnly: false, secure: secureCookies, sameSite: 'lax', path: '/', maxAge: 0 });
}

export function setChallengeCookie(response: NextResponse, browserToken: string) {
  response.cookies.set(CHALLENGE_COOKIE, browserToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'strict',
    path: '/',
    maxAge: 5 * 60,
  });
}

export function clearChallengeCookie(response: NextResponse) {
  response.cookies.set(CHALLENGE_COOKIE, '', {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export function requestOriginAllowed(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === authConfiguration().origin;
  } catch {
    return false;
  }
}

export async function authenticatedWriteAllowed(request: NextRequest, session: AuthSession) {
  if (!requestOriginAllowed(request)) return false;
  const headerToken = request.headers.get('x-csrf-token') ?? '';
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value ?? '';
  if (!headerToken || headerToken !== cookieToken) return false;
  return csrfMatches(session, headerToken);
}

export function requestNetworkAddress(request: NextRequest) {
  return request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'unknown';
}
