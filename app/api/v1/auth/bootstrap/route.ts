import { NextRequest, NextResponse } from 'next/server';
import { bootstrapSecret, createBootstrapActivation, sha256 } from '@/db/auth';

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function POST(request: NextRequest) {
  const configuredSecret = bootstrapSecret();
  const providedSecret = request.headers.get('x-expo-bootstrap-secret') ?? '';
  const [configuredHash, providedHash] = await Promise.all([sha256(configuredSecret), sha256(providedSecret)]);
  if (configuredSecret.length < 32 || providedSecret.length < 32 || !constantTimeEqual(configuredHash, providedHash)) {
    return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });
  }
  let payload: { email?: string; display_name?: string; code_hash?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_REQUEST' }, { status: 400 });
  }
  try {
    const result = await createBootstrapActivation({
      email: String(payload.email ?? ''),
      displayName: String(payload.display_name ?? ''),
      codeHash: String(payload.code_hash ?? ''),
    });
    return NextResponse.json({ ok: true, expires_at: result.expiresAt });
  } catch (error) {
    if (error instanceof Error && error.message === 'BOOTSTRAP_CLOSED') {
      return NextResponse.json({ code: 'BOOTSTRAP_CLOSED' }, { status: 409 });
    }
    return NextResponse.json({ code: 'INVALID_REQUEST' }, { status: 422 });
  }
}
