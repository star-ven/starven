export function isConfiguredAdmin(userId, configuredId) {
  return typeof configuredId === 'string' && configuredId.trim().length > 0 && typeof userId === 'string' && userId === configuredId;
}
export function isSameOriginWrite(request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}
export async function readBoundedBody(request, limit) {
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > limit)) throw new Error('请求内容过大。');
  if (!request.body) return new Uint8Array();
  const reader=request.body.getReader(); const chunks=[]; let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read(); if(done) break;
      size+=value.byteLength; if(size>limit) { await reader.cancel(); throw new Error('请求内容过大。'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const output=new Uint8Array(size); let offset=0;
  for(const chunk of chunks) { output.set(chunk,offset); offset+=chunk.byteLength; }
  return output;
}
