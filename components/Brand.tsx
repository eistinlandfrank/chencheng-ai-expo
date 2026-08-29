import Link from 'next/link';

export default function Brand({ compact = false, href = '/', subtitle }: { compact?: boolean; href?: string; subtitle?: string }) {
  return (
    <Link className={`brand-lockup ${compact ? 'compact' : ''}`} href={href} aria-label="Expo Service AI 首页">
      <span className="bot-logo" aria-hidden="true">
        <span className="bot-antenna" />
        <span className="bot-screen"><i /><i /></span>
      </span>
      <span className="brand-words"><strong>Expo</strong><em>Service AI</em>{!compact && <small>{subtitle ?? '智能逛展助手'}</small>}</span>
    </Link>
  );
}
