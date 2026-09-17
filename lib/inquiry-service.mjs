import { validateInquiry } from "./contracts.mjs";

const SUCCESS = Object.freeze({
  status: 201,
  body: Object.freeze({ ok: true, message: "留言已安全保存，我们会尽快查看。" }),
});

export async function submitInquiry({
  payload,
  sourceHash,
  insertOnce,
  now = () => new Date(),
}) {
  if (typeof sourceHash !== "string" || sourceHash === "") {
    throw new Error("A server-derived source hash is required.");
  }

  const validated = validateInquiry(payload);
  if (!validated.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        message: "请检查表单中的信息。",
        fieldErrors: validated.fieldErrors,
      },
    };
  }

  if (validated.honeypot) return SUCCESS;

  const oneHourAgo = new Date(now().getTime() - 60 * 60 * 1000).toISOString();
  const inquiry = await insertOnce({ ...validated.value, sourceHash }, oneHourAgo);
  if (!inquiry) {
    return {
      status: 429,
      body: { ok: false, message: "提交过于频繁，请稍后再试。" },
    };
  }

  return SUCCESS;
}
