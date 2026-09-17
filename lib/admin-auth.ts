import { env } from 'cloudflare:workers';
import { getChatGPTUser, requireChatGPTUser } from '@/app/chatgpt-auth';
import { isConfiguredAdmin, isSameOriginWrite, readBoundedBody } from './admin-policy.mjs';
export function adminJson(value: unknown, status=200) {
  return Response.json(value,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}
export async function requireAdminPage(returnTo:string) {
  const user=await requireChatGPTUser(returnTo);
  return isConfiguredAdmin(user.userId,env.ADMIN_USER_ID) ? user : null;
}
export async function requireAdminRequest() {
  const user=await getChatGPTUser();
  if(!user) return adminJson({error:'请先登录。'},401);
  if(!isConfiguredAdmin(user.userId,env.ADMIN_USER_ID)) return adminJson({error:'仅网站所有者可访问。'},403);
  return null;
}
export function requireSameOrigin(request:Request) {
  return isSameOriginWrite(request) ? null : adminJson({error:'请求来源无效。'},403);
}
export async function adminPayload(request:Request) {
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new Error('请使用 JSON 请求。');
  const bytes=await readBoundedBody(request,32*1024);
  return JSON.parse(new TextDecoder().decode(bytes));
}
export function operationError(error:unknown) {
  console.error('Admin operation failed',error);
  return adminJson({error:'操作未完成，请检查输入后重试。'},400);
}
