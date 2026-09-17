import test from "node:test";
import assert from "node:assert/strict";

import { submitInquiry } from "../lib/inquiry-service.mjs";

const validPayload = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  name: " 访客 ",
  contact: " visitor@example.com ",
  topic: "网站与数字体验",
  message: " 希望讨论一个完整的品牌网站合作项目。 ",
  website: "",
};

test("submitInquiry stores one normalized valid inquiry", async () => {
  const calls = [];
  const result = await submitInquiry({
    payload: validPayload,
    sourceHash: "source-hash",
    now: () => new Date("2026-09-17T10:30:00.000Z"),
    insertOnce: async (value, since) => {
      calls.push([value, since]);
      return { submissionId: value.submissionId };
    },
  });

  assert.deepEqual(result, {
    status: 201,
    body: { ok: true, message: "留言已安全保存，我们会尽快查看。" },
  });
  assert.deepEqual(calls, [[{
      submissionId: validPayload.submissionId,
      name: "访客",
      contact: "visitor@example.com",
      topic: "网站与数字体验",
      message: "希望讨论一个完整的品牌网站合作项目。",
      sourceHash: "source-hash",
    }, "2026-09-17T09:30:00.000Z"]]);
});

test("submitInquiry returns field errors without consulting storage", async () => {
  let storageCalls = 0;
  const result = await submitInquiry({
    payload: { ...validPayload, name: "名", message: "太短" },
    sourceHash: "source-hash",
    insertOnce: async () => { storageCalls += 1; },
  });

  assert.equal(result.status, 400);
  assert.equal(result.body.ok, false);
  assert.equal(result.body.message, "请检查表单中的信息。" );
  assert.deepEqual(result.body.fieldErrors, {
    name: "称呼需为 2–60 个字符。",
    message: "留言需为 10–2000 个字符。",
  });
  assert.equal(storageCalls, 0);
});

test("submitInquiry accepts a filled honeypot without reading or writing storage", async () => {
  let storageCalls = 0;
  const result = await submitInquiry({
    payload: { ...validPayload, website: "https://spam.invalid" },
    sourceHash: "source-hash",
    insertOnce: async () => { storageCalls += 1; },
  });

  assert.deepEqual(result, {
    status: 201,
    body: { ok: true, message: "留言已安全保存，我们会尽快查看。" },
  });
  assert.equal(storageCalls, 0);
});

test("submitInquiry rejects the fourth recent accepted submission", async () => {
  let inserts = 0;
  const result = await submitInquiry({
    payload: validPayload,
    sourceHash: "source-hash",
    insertOnce: async () => { inserts += 1; return null; },
  });

  assert.deepEqual(result, {
    status: 429,
    body: { ok: false, message: "提交过于频繁，请稍后再试。" },
  });
  assert.equal(inserts, 1);
});

test("submitInquiry maps an idempotent retry to the same success response", async () => {
  const result = await submitInquiry({
    payload: validPayload,
    sourceHash: "source-hash",
    insertOnce: async () => ({ submissionId: validPayload.submissionId }),
  });

  assert.deepEqual(result, {
    status: 201,
    body: { ok: true, message: "留言已安全保存，我们会尽快查看。" },
  });
});

test("submitInquiry accepts an old existing submission ID after three newer submissions", async () => {
  let insertCalls = 0;
  const result = await submitInquiry({
    payload: validPayload,
    sourceHash: "source-hash",
    now: () => new Date("2026-09-17T10:30:00.000Z"),
    insertOnce: async (value, since) => {
      insertCalls += 1;
      assert.equal(value.submissionId, validPayload.submissionId);
      assert.equal(since, "2026-09-17T09:30:00.000Z");
      return { submissionId: validPayload.submissionId };
    },
  });

  assert.equal(result.status, 201);
  assert.equal(insertCalls, 1);
});

test("submitInquiry fails closed when no server-derived source hash is available", async () => {
  let storageCalls = 0;

  await assert.rejects(
    submitInquiry({
      payload: validPayload,
      sourceHash: "",
      insertOnce: async () => { storageCalls += 1; },
    }),
    /source hash/i,
  );
  assert.equal(storageCalls, 0);
});
