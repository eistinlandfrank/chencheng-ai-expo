import { ArrowUpRight, Building2, Check, Store, User } from 'lucide-react';

export type PortalId = 'visitor' | 'exhibitor' | 'operations';

const portals: Array<{
  id: PortalId;
  href: string;
  label: string;
  description: string;
  icon: typeof User;
}> = [
  {
    id: 'visitor',
    href: '/',
    label: '观众端',
    description: '浏览展位与规划行程',
    icon: User,
  },
  {
    id: 'exhibitor',
    href: '/exhibitor',
    label: '展商端',
    description: '管理展位与预约',
    icon: Store,
  },
  {
    id: 'operations',
    href: '/operations',
    label: '场馆运营端',
    description: '进入场馆运营工作台',
    icon: Building2,
  },
];

export default function PortalSwitcher({ activePortal }: { activePortal: PortalId }) {
  return (
    <nav className="auth-portal-switcher" aria-label="三端门户切换" data-el="portal-switcher">
      <div className="auth-portal-heading">
        <strong>切换门户</strong>
        <span>选择角色后进入对应入口</span>
      </div>
      <div className="auth-portal-grid">
        {portals.map((portal) => {
          const active = portal.id === activePortal;
          const Icon = portal.icon;
          return (
            <a
              key={portal.id}
              href={portal.href}
              className={active ? 'active' : undefined}
              aria-current={active ? 'page' : undefined}
              data-portal={portal.id}
              data-active={active ? 'true' : 'false'}
            >
              <span className="auth-portal-icon"><Icon size={18} aria-hidden="true" /></span>
              <span className="auth-portal-copy">
                <strong>{portal.label}</strong>
                <small>{active ? '当前门户' : portal.description}</small>
              </span>
              {active
                ? <Check className="auth-portal-status" size={16} aria-hidden="true" />
                : <ArrowUpRight className="auth-portal-status" size={16} aria-hidden="true" />}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
