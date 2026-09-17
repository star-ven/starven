import { env } from "cloudflare:workers";

import { createInquiryWithinRateLimit } from "../../../db/inquiries";
import { submitInquiry } from "../../../lib/inquiry-service.mjs";

const MAX_BODY_BYTES = 32 * 1024;
type InquiryFieldErrors = Partial<Record<"submissionId" | "name" | "contact" | "topic" | "message", string>>;

class MalformedBodyError extends Error {}
class PayloadTooLargeError extends Error {}

function json(body: { ok: boolean; message: string; fieldErrors?: InquiryFieldErrors }, status: number) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function readBoundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    throw new PayloadTooLargeError();
  }
  if (!request.body) throw new MalformedBodyError();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new PayloadTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new MalformedBodyError();
  }
}

async function hashSource(source: string, salt: string) {
  const bytes = new TextEncoder().encode(`${salt}\u0000${source}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: Request) {
  if (!env.RATE_LIMIT_SALT) {
    console.error("Inquiry submission is unavailable: RATE_LIMIT_SALT is not configured.");
    return json({ ok: false, message: "留言服务暂时不可用，请稍后重试。" }, 503);
  }

  try {
    const payload = await readBoundedJson(request);
    const source = request.headers.get("CF-Connecting-IP")?.trim() || "unavailable";
    const sourceHash = await hashSource(source, env.RATE_LIMIT_SALT);
    const result = await submitInquiry({
      payload,
      sourceHash,
      insertOnce: createInquiryWithinRateLimit,
    });

    return json(result.body, result.status);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return json({ ok: false, message: "提交内容过大，请精简后重试。" }, 413);
    }
    if (error instanceof MalformedBodyError) {
      return json({ ok: false, message: "无法读取提交内容，请检查后重试。" }, 400);
    }

    console.error("Inquiry submission failed.", error);
    return json({ ok: false, message: "留言服务暂时不可用，请稍后重试。" }, 503);
  }
}
