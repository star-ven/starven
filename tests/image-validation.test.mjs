import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectCover } from '../lib/image-validation.mjs';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,16,0,0,0,16,8,2,0,0,0,0,0,0,0]);
test('PNG dimensions and type must match',()=>{
 assert.deepEqual(inspectCover(png,'image/png'),{ok:true,type:'image/png',width:16,height:16});
 assert.equal(inspectCover(png,'image/jpeg').ok,false);
 const zero=png.slice(); zero[19]=0; assert.equal(inspectCover(zero,'image/png').ok,false);
 const huge=png.slice(); huge[18]=255; assert.equal(inspectCover(huge,'image/png').ok,false);
});
test('JPEG SOF dimensions',()=>{
 const jpg=Uint8Array.from([255,216,255,192,0,11,8,0,16,0,32,1,1,17,0,255,217]);
 assert.deepEqual(inspectCover(jpg,'image/jpeg'),{ok:true,type:'image/jpeg',width:32,height:16});
 assert.equal(inspectCover(jpg.slice(0,8),'image/jpeg').ok,false);
});
test('lossless WebP dimensions',()=>{
 const bytes=Uint8Array.from([82,73,70,70,18,0,0,0,87,69,66,80,86,80,56,76,5,0,0,0,47,15,192,3,0,0]);
 assert.deepEqual(inspectCover(bytes,'image/webp'),{ok:true,type:'image/webp',width:16,height:16});
});
test('reject unsupported, truncated and oversized payloads',()=>{
 assert.equal(inspectCover(new TextEncoder().encode('<svg/>'),'image/png').ok,false);
 assert.equal(inspectCover(png.slice(0,22),'image/png').ok,false);
 assert.equal(inspectCover(new Uint8Array(5*1024*1024+1),'image/png').ok,false);
});
