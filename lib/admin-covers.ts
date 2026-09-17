import { env } from 'cloudflare:workers';
import { listAllProjects } from '@/db/projects';
import { COVER_KEY_PATTERN } from './image-validation.mjs';
export async function trustedCover(key:unknown) {
  if(key===null||key===undefined||key==='') return {coverKey:null,coverContentType:null,coverWidth:null,coverHeight:null};
  if(typeof key!=='string'||!COVER_KEY_PATTERN.test(key)) throw new Error('无效的封面。');
  const object=await env.BUCKET.head(key);
  const width=Number(object?.customMetadata?.width),height=Number(object?.customMetadata?.height);
  const type=object?.httpMetadata?.contentType;
  if(!object||!['image/jpeg','image/png','image/webp'].includes(type??'')||!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>12000||height>12000) throw new Error('封面不存在或无效。');
  return {coverKey:key,coverContentType:type!,coverWidth:width,coverHeight:height};
}
export async function deleteUnusedCover(key:string|null) {
  if(!key||!COVER_KEY_PATTERN.test(key)) return false;
  if((await listAllProjects()).some(p=>p.coverKey===key)) return false;
  await env.BUCKET.delete(key); return true;
}
export async function cleanupCover(key:string|null) {
  try { await deleteUnusedCover(key); } catch(error) { console.error('Unused cover cleanup failed',error); }
}
