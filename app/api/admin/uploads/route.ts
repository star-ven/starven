import { env } from 'cloudflare:workers';
import { requireAdminRequest,requireSameOrigin,adminJson,adminPayload,operationError } from '@/lib/admin-auth';
import { readBoundedBody } from '@/lib/admin-policy.mjs';
import { inspectCover,MAX_COVER_BYTES,COVER_KEY_PATTERN } from '@/lib/image-validation.mjs';
import { deleteUnusedCover } from '@/lib/admin-covers';
export const dynamic='force-dynamic';
export async function POST(request:Request) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const origin=requireSameOrigin(request); if(origin) return origin;
  try {
    const contentType=request.headers.get('content-type')??'';
    if(!contentType.toLowerCase().startsWith('multipart/form-data;')) return adminJson({error:'请选择封面文件。'},415);
    const bytes=await readBoundedBody(request,MAX_COVER_BYTES+64*1024);
    const form=await new Response(bytes,{headers:{'Content-Type':contentType}}).formData();
    const entries=[...form.entries()]; const file=form.get('cover');
    if(entries.length!==1||!(file instanceof File)||file.size>MAX_COVER_BYTES) return adminJson({error:'仅支持一个 5 MiB 以内的封面文件。'},422);
    const data=new Uint8Array(await file.arrayBuffer()); const inspected=inspectCover(data,file.type);
    if('error' in inspected) return adminJson({error:inspected.error},422);
    const extension=inspected.type==='image/jpeg'?'jpg':inspected.type==='image/png'?'png':'webp';
    const key=`covers/${crypto.randomUUID()}.${extension}`;
    await env.BUCKET.put(key,data,{httpMetadata:{contentType:inspected.type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{width:String(inspected.width),height:String(inspected.height)}});
    return adminJson({key,contentType:inspected.type,width:inspected.width,height:inspected.height,url:`/api/media/${encodeURIComponent(key)}`},201);
  } catch(error) { return operationError(error); }
}
export async function DELETE(request:Request) {
  const denied=await requireAdminRequest(); if(denied) return denied;
  const origin=requireSameOrigin(request); if(origin) return origin;
  try {
    const {key}=await adminPayload(request);
    if(typeof key!=='string'||!COVER_KEY_PATTERN.test(key)) return adminJson({error:'无效的封面。'},422);
    if(!await deleteUnusedCover(key)) return adminJson({error:'封面仍被作品使用。'},409);
    return new Response(null,{status:204,headers:{'Cache-Control':'private, no-store'}});
  } catch(error) { return operationError(error); }
}
