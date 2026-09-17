'use client';
import { useState } from 'react';
import { toast,Toaster } from 'sonner';
import type { Project,Inquiry } from '@/db/schema';
import { Tabs,TabsList,TabsTrigger,TabsContent } from '@/components/ui/tabs';
import { Table,TableHeader,TableBody,TableRow,TableHead,TableCell } from '@/components/ui/table';
import { Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select,SelectTrigger,SelectValue,SelectContent,SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
type InboxItem=Omit<Inquiry,'sourceHash'|'submissionId'>;
type Draft=Omit<Project,'id'|'createdAt'|'updatedAt'> & {id?:string};
type ApiResponse={project:Project;projects:Project[];inquiry:InboxItem;inquiries:InboxItem[];key:string;contentType:string;width:number;height:number;error?:string;fieldErrors?:Record<string,string>};
const blank:Draft={title:'',summary:'',category:'',year:new Date().getFullYear(),coverKey:null,coverContentType:null,coverWidth:null,coverHeight:null,externalUrl:'',status:'draft',sortOrder:0};
const statusLabels={new:'未读',read:'已读',resolved:'已处理'};
async function api(path:string,method='GET',body?:unknown) {
  const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body instanceof FormData?undefined:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
  const result=(response.status===204?{}:await response.json()) as ApiResponse;
  if(!response.ok) throw new Error(result.fieldErrors?Object.values(result.fieldErrors).join(' '):result.error??'操作未完成，请重试。');
  return result;
}
export default function AdminClient({initialProjects,initialInquiries}:{initialProjects:Project[];initialInquiries:InboxItem[]}) {
  const [projects,setProjects]=useState(initialProjects),[inquiries,setInquiries]=useState(initialInquiries);
  const [draft,setDraft]=useState<Draft|null>(null),[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[editorError,setEditorError]=useState(''),[inboxError,setInboxError]=useState('');
  const [filter,setFilter]=useState('all'),[detail,setDetail]=useState<InboxItem|null>(null);
  const [deletion,setDeletion]=useState<{kind:'projects'|'inquiries';id:string;name:string}|null>(null),[deleteError,setDeleteError]=useState('');
  function edit(project?:Project) {setDraft(project?{...project}:{...blank});setFile(null);setEditorError('');}
  function change<K extends keyof Draft>(key:K,value:Draft[K]) {setDraft(d=>d?{...d,[key]:value}:d);}
  async function save() {
    if(!draft||busy) return; setBusy(true);setEditorError(''); let uploaded:string|null=null;
    try {
      let value={...draft};
      if(file) {
        const form=new FormData();form.set('cover',file);
        const cover=await api('/api/admin/uploads','POST',form);uploaded=cover.key;
        value={...value,coverKey:cover.key,coverContentType:cover.contentType,coverWidth:cover.width,coverHeight:cover.height};
      }
      const result=await api(`/api/admin/projects${draft.id?`/${draft.id}`:''}`,draft.id?'PATCH':'POST',value);
      uploaded=null;
      setProjects(current=>[...current.filter(p=>p.id!==result.project.id),result.project].sort((a,b)=>a.sortOrder-b.sortOrder));
      setDraft(null);setFile(null);toast.success('作品已保存');
    } catch(e) {
      let message=e instanceof Error?e.message:'保存失败。';
      if(uploaded) {try {await api('/api/admin/uploads','DELETE',{key:uploaded});}catch {message+=' 新上传封面清理未完成，请稍后重试。';}}
      setEditorError(message);
    } finally {setBusy(false);}
  }
  async function changeStatus(item:InboxItem,status:string) {
    setBusy(true);setInboxError('');
    try {const result=await api(`/api/admin/inquiries/${item.id}`,'PATCH',{status});setInquiries(rows=>rows.map(r=>r.id===item.id?result.inquiry:r));setDetail(result.inquiry);toast.success('留言状态已更新');}
    catch(e){setInboxError(e instanceof Error?e.message:'更新失败。');} finally {setBusy(false);}
  }
  async function remove() {
    if(!deletion)return;setBusy(true);setDeleteError('');
    try {
      await api(`/api/admin/${deletion.kind}/${deletion.id}`,'DELETE',{confirm:true});
      if(deletion.kind==='projects')setProjects(rows=>rows.filter(r=>r.id!==deletion.id));
      else {setInquiries(rows=>rows.filter(r=>r.id!==deletion.id));if(detail?.id===deletion.id)setDetail(null);}
      setDeletion(null);toast.success('已删除');
    }catch(e){setDeleteError(e instanceof Error?e.message:'删除失败。');}finally{setBusy(false);}
  }
  async function refresh() {
    setBusy(true);setError('');
    try {const [p,i]=await Promise.all([api('/api/admin/projects'),api('/api/admin/inquiries')]);setProjects(p.projects);setInquiries(i.inquiries);toast.success('已刷新');}
    catch(e){setError(e instanceof Error?e.message:'刷新失败。');}finally{setBusy(false);}
  }
  return <><Toaster richColors/><Tabs defaultValue="works"><div className="admin-toolbar"><TabsList><TabsTrigger value="works">作品 · {projects.length}</TabsTrigger><TabsTrigger value="inbox">留言 · {inquiries.filter(i=>i.status==='new').length} 未读</TabsTrigger></TabsList><Button onClick={refresh} disabled={busy}>刷新</Button></div>{error&&<p className="admin-error" role="alert">{error}</p>}
    <TabsContent value="works"><div className="admin-toolbar"><p>编辑、发布并整理你的作品。排序数值越小越靠前。</p><Button onClick={()=>edit()}>新建作品 ＋</Button></div><Table><TableHeader><TableRow><TableHead>作品</TableHead><TableHead>分类 / 年份</TableHead><TableHead>状态</TableHead><TableHead>排序</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{projects.map(p=><TableRow key={p.id}><TableCell><strong>{p.title}</strong></TableCell><TableCell>{p.category||'—'} / {p.year??'—'}</TableCell><TableCell><span className={p.status==='published'?'admin-status published':'admin-status'}>{p.status==='published'?'已发布':'草稿'}</span></TableCell><TableCell>{p.sortOrder}</TableCell><TableCell><div className="admin-actions"><Button onClick={()=>edit(p)}>编辑</Button><Button onClick={()=>{setDeleteError('');setDeletion({kind:'projects',id:p.id,name:p.title});}}>删除</Button></div></TableCell></TableRow>)}</TableBody></Table>{!projects.length&&<p className="admin-empty">尚无作品，创建第一份草稿。</p>}</TabsContent>
    <TabsContent value="inbox"><div className="admin-toolbar"><p>来自网站的合作咨询。</p><Select value={filter} onValueChange={setFilter}><SelectTrigger aria-label="筛选留言状态"><SelectValue/></SelectTrigger><SelectContent className="sv-admin-popover"><SelectItem value="all">全部状态</SelectItem>{Object.entries(statusLabels).map(([key,label])=><SelectItem value={key} key={key}>{label}</SelectItem>)}</SelectContent></Select></div><Table><TableHeader><TableRow><TableHead>称呼</TableHead><TableHead>合作方向</TableHead><TableHead>状态</TableHead><TableHead>时间</TableHead><TableHead>操作</TableHead></TableRow></TableHeader><TableBody>{inquiries.filter(i=>filter==='all'||i.status===filter).map(i=><TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{i.topic}</TableCell><TableCell>{statusLabels[i.status]}</TableCell><TableCell>{i.createdAt.slice(0,16).replace('T',' ')}</TableCell><TableCell><Button onClick={()=>{setDetail(i);setInboxError('');}}>查看详情</Button></TableCell></TableRow>)}</TableBody></Table>{!inquiries.filter(i=>filter==='all'||i.status===filter).length&&<p className="admin-empty">当前没有留言。</p>}</TabsContent></Tabs>
    <Dialog open={!!draft} onOpenChange={open=>{if(!open&&!busy){setDraft(null);setFile(null);}}}><DialogContent className="sv-admin-dialog" showCloseButton={false}><DialogHeader><DialogTitle>{draft?.id?'编辑作品':'新建作品'}</DialogTitle><DialogDescription>先保存草稿，准备好内容和封面后发布。</DialogDescription></DialogHeader>{draft&&<form onSubmit={e=>{e.preventDefault();void save();}} className="admin-form"><div className="admin-form-grid"><label>标题<Input value={draft.title} onChange={e=>change('title',e.target.value)} maxLength={120} required/></label><label>分类<Input value={draft.category} onChange={e=>change('category',e.target.value)} maxLength={80}/></label><label>年份<Input type="number" min="1900" max="2100" value={draft.year??''} onChange={e=>change('year',e.target.value===''?null:Number(e.target.value))}/></label><label>排序<Input type="number" value={draft.sortOrder} onChange={e=>change('sortOrder',Number(e.target.value))}/></label></div><label>作品简介<Textarea value={draft.summary} onChange={e=>change('summary',e.target.value)} maxLength={1000} rows={4}/></label><label>作品链接（HTTPS）<Input type="url" value={draft.externalUrl} onChange={e=>change('externalUrl',e.target.value)} placeholder="https://"/></label><label>封面（JPG / PNG / WebP，最大 5 MiB）<Input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>{draft.coverKey&&<div className="admin-cover"><img src={`/api/media/${encodeURIComponent(draft.coverKey)}`} alt="当前封面"/><Button type="button" onClick={()=>{change('coverKey',null);setFile(null);}}>移除封面</Button></div>}<label>发布状态<Select value={draft.status} onValueChange={v=>change('status',v as Draft['status'])} disabled={!draft.id}><SelectTrigger aria-label="作品发布状态"><SelectValue/></SelectTrigger><SelectContent className="sv-admin-popover"><SelectItem value="draft">草稿 / 隐藏</SelectItem><SelectItem value="published">已发布</SelectItem></SelectContent></Select></label>{editorError&&<p role="alert" className="admin-error">{editorError}</p>}<div className="admin-actions"><Button type="button" disabled={busy} onClick={()=>{setDraft(null);setFile(null);}}>取消</Button><Button type="submit" disabled={busy}>{busy?'保存中…':'保存作品'}</Button></div></form>}</DialogContent></Dialog>
    <Dialog open={!!detail} onOpenChange={open=>{if(!open&&!busy)setDetail(null);}}><DialogContent className="sv-admin-dialog" showCloseButton={false}><DialogTitle>留言详情</DialogTitle><DialogDescription>{detail?.topic}</DialogDescription>{detail&&<><dl className="admin-detail"><dt>称呼</dt><dd>{detail.name}</dd><dt>联系方式</dt><dd>{detail.contact}</dd><dt>提交时间</dt><dd>{detail.createdAt}</dd></dl><p className="admin-message">{detail.message}</p><Select disabled={busy} value={detail.status} onValueChange={v=>void changeStatus(detail,v)}><SelectTrigger aria-label="留言处理状态"><SelectValue/></SelectTrigger><SelectContent className="sv-admin-popover">{Object.entries(statusLabels).map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>{inboxError&&<p role="alert" className="admin-error">{inboxError}</p>}<div className="admin-actions"><Button disabled={busy} onClick={()=>setDetail(null)}>关闭</Button><Button disabled={busy} onClick={()=>{setDeleteError('');setDeletion({kind:'inquiries',id:detail.id,name:`${detail.name}的留言`});}}>删除留言</Button></div></>}</DialogContent></Dialog>
    <AlertDialog open={!!deletion} onOpenChange={open=>{if(!open&&!busy)setDeletion(null);}}><AlertDialogContent className="sv-admin-dialog"><AlertDialogTitle>确认删除？</AlertDialogTitle><AlertDialogDescription>将永久删除「{deletion?.name}」。此操作无法撤销。</AlertDialogDescription>{deleteError&&<p role="alert" className="admin-error">{deleteError}</p>}<AlertDialogFooter><AlertDialogCancel disabled={busy}>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={e=>{e.preventDefault();void remove();}}>{busy?'删除中…':'确认删除'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
