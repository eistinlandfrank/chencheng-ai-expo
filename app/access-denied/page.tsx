import Link from 'next/link';
import Brand from '@/components/Brand';

export default function AccessDeniedPage() {
  return (
    <main className="access-page">
      <section>
        <Brand />
        <h1>当前账号没有此工作台权限</h1>
        <p>请使用已绑定该展会角色的账号，或联系主办方管理员开通。</p>
        <Link href="/">返回观众端</Link>
      </section>
    </main>
  );
}
