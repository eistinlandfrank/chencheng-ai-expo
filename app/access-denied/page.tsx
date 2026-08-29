import Link from 'next/link';
import Brand from '@/components/Brand';
import LogoutButton from '@/components/LogoutButton';

export default function AccessDeniedPage() {
  return (
    <main className="access-page">
      <section>
        <Brand />
        <h1>当前账号没有此工作台权限</h1>
        <p>请使用已绑定该展会角色的账号，或联系主办方管理员开通。</p>
        <div className="auth-secondary"><LogoutButton /><Link href="/">返回观众端</Link></div>
      </section>
    </main>
  );
}
