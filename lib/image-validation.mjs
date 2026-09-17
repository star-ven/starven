export const MAX_COVER_BYTES=5*1024*1024;
export const COVER_KEY_PATTERN=/^covers\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/;
export function inspectCover(bytes,declaredType) {
  const invalid={ok:false,error:'请上传 5 MiB 以内、尺寸不超过 12000×12000 的有效 JPG、PNG 或 WebP。'};
  if(!(bytes instanceof Uint8Array)||bytes.length>MAX_COVER_BYTES||bytes.length<12) return invalid;
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const tag=(offset,n)=>String.fromCharCode(...bytes.subarray(offset,offset+n));
  let type='',width=0,height=0;
  if(bytes.length>=33 && [137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x) && v.getUint32(8)===13 && tag(12,4)==='IHDR') {
    type='image/png'; width=v.getUint32(16); height=v.getUint32(20);
  } else if(bytes[0]===255&&bytes[1]===216) {
    let i=2;
    while(i+3<bytes.length) {
      if(bytes[i++]!==255) return invalid;
      while(bytes[i]===255) i++;
      const marker=bytes[i++]; if(marker===0xd9||marker===0xda) break;
      if(marker===1||(marker>=0xd0&&marker<=0xd7)) continue;
      if(i+2>bytes.length) return invalid;
      const length=v.getUint16(i); if(length<2||i+length>bytes.length) return invalid;
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        if(length<8||length!==8+3*bytes[i+7]) return invalid;
        type='image/jpeg'; height=v.getUint16(i+3); width=v.getUint16(i+5); break;
      }
      i+=length;
    }
  } else if(tag(0,4)==='RIFF'&&tag(8,4)==='WEBP'&&v.getUint32(4,true)+8===bytes.length) {
    let i=12;
    while(i+8<=bytes.length) {
      const kind=tag(i,4), size=v.getUint32(i+4,true), p=i+8;
      if(size>bytes.length-p) return invalid;
      if(kind==='VP8X'&&size===10) { width=1+bytes[p+4]+bytes[p+5]*256+bytes[p+6]*65536; height=1+bytes[p+7]+bytes[p+8]*256+bytes[p+9]*65536; }
      if(kind==='VP8L'&&size>=5&&bytes[p]===0x2f) { const bits=v.getUint32(p+1,true); if(bits>>>29) return invalid; width=(bits&0x3fff)+1; height=((bits>>>14)&0x3fff)+1; }
      if(kind==='VP8 '&&size>=10&&bytes[p+3]===0x9d&&bytes[p+4]===1&&bytes[p+5]===0x2a) { width=v.getUint16(p+6,true)&0x3fff; height=v.getUint16(p+8,true)&0x3fff; }
      if(width&&height) { type='image/webp'; break; }
      i=p+size+(size%2);
    }
  }
  return type===declaredType&&width>0&&height>0&&width<=12000&&height<=12000 ? {ok:true,type,width,height} : invalid;
}
