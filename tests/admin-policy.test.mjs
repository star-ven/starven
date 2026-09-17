import test from 'node:test';
import assert from 'node:assert/strict';
import { isConfiguredAdmin, isSameOriginWrite, readBoundedBody } from '../lib/admin-policy.mjs';
test('owner matching is exact and fails closed', () => {
  assert.equal(isConfiguredAdmin('owner', 'owner'), true);
  for (const [id, configured] of [['other','owner'], ['owner',''], ['', ''], ['owner',' owner'], [undefined,undefined]]) assert.equal(isConfiguredAdmin(id,configured), false);
});
test('writes reject cross origin and missing origin', () => {
  assert.equal(isSameOriginWrite(new Request('https://a.test/api', {headers:{origin:'https://a.test'}})),true);
  assert.equal(isSameOriginWrite(new Request('https://a.test/api', {headers:{origin:'https://b.test'}})),false);
  assert.equal(isSameOriginWrite(new Request('https://a.test/api')),false);
});
test('stream limit applies without a content length header', async () => {
  await assert.rejects(readBoundedBody(new Request('https://a.test',{method:'POST',body:'12345'}),4));
  assert.equal((await readBoundedBody(new Request('https://a.test',{method:'POST',body:'1234'}),4)).byteLength,4);
});
