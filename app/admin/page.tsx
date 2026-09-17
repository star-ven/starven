import { requireAdminPage } from '@/lib/admin-auth';
import { listAllProjects } from '@/db/projects';
import { listInquiries } from '@/db/inquiries';
import { authenticatedSignOutPath } from '@/app/chatgpt-auth';
import AdminClient from './admin-client';
import './admin.css';
export const dynamic='force-dynamic';
export const revalidate=0;
export default async function AdminPage() {
  const user=await requireAdminPage('/admin');
  if(!user) return <main className="sv-admin"><h1>403 · 无权访问</h1><p>此页面仅对网站所有者开放。</p><a href="/" target="_top">返回首页</a></main>;
  let data;
  try { data=await Promise.all([listAllProjects(),listInquiries()]); }
  catch(error) {
    console.error('Admin data unavailable',error);
    return <main className="sv-admin"><h1>管理后台暂时无法读取数据</h1><p className="admin-error" role="alert">数据服务暂时不可用。请稍后重试。</p><nav className="admin-toolbar"><a href="/admin">重新加载</a><a href={authenticatedSignOutPath(user, '/')} target="_top">退出登录</a></nav></main>;
  }
  const [projects,rows]=data;
  const inquiries=rows.map(({sourceHash,submissionId,...inquiry})=>inquiry);
  return <main className="sv-admin"><header className="admin-header"><div><span className="admin-kicker">STARVEN / STUDIO DESK</span><h1>内容管理</h1></div><nav><a href="/" target="_blank" rel="noreferrer">查看网站 ↗</a><a href={authenticatedSignOutPath(user, '/')} target="_top">退出登录</a></nav></header><AdminClient initialProjects={projects} initialInquiries={inquiries}/></main>;
}
