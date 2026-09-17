import { env } from 'cloudflare:workers';
import { COVER_KEY_PATTERN } from '@/lib/image-validation.mjs';
export async function GET(_request:Request,{params}:{params:Promise<{key:string}>}) {
  const {key}=await params;
  if(!COVER_KEY_PATTERN.test(key)) return new Response(null,{status:404});
  const object=await env.BUCKET.get(key);
  if(!object) return new Response(null,{status:404});
  return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType??'application/octet-stream','ETag':object.httpEtag,'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'}});
}
