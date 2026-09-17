import test from "node:test";
import assert from "node:assert/strict";

import {
  INQUIRY_TOPICS,
  safeHttpsUrl,
  validateInquiry,
  validateProject,
} from "../lib/contracts.mjs";

const validInquiry = {
  submissionId: "550e8400-e29b-41d4-a716-446655440000",
  name: " 访客 ",
  contact: " visitor@example.com ",
  topic: "网站与数字体验",
  message: " 希望讨论一个完整的品牌网站合作项目。 ",
  website: "",
};

const validPublishedProject = {
  title: " StarVen 作品 ",
  summary: " 一次完整的品牌表达。 ",
  category: " 品牌网站 ",
  year: 2026,
  coverKey: " covers/550e8400-e29b-41d4-a716-446655440000.webp ",
  coverContentType: "image/webp",
  coverWidth: 1600,
  coverHeight: 900,
  externalUrl: " https://example.com/work?a=1 ",
  status: "published",
  sortOrder: 4,
};

test("inquiry validation accepts and trims a complete bounded payload", () => {
  const result = validateInquiry(validInquiry);

  assert.deepEqual(result, {
    ok: true,
    honeypot: false,
    value: {
      submissionId: validInquiry.submissionId,
      name: "访客",
      contact: "visitor@example.com",
      topic: "网站与数字体验",
      message: "希望讨论一个完整的品牌网站合作项目。",
    },
  });
});

test("inquiry validation accepts only the approved topics", () => {
  assert.deepEqual(INQUIRY_TOPICS, [
    "AI 视频与影像",
    "网站与数字体验",
    "视觉与品牌设计",
    "内容策划与运营",
    "项目管理与顾问",
    "其他",
  ]);

  for (const topic of INQUIRY_TOPICS) {
    assert.equal(validateInquiry({ ...validInquiry, topic }).ok, true, topic);
  }

  const rejected = validateInquiry({ ...validInquiry, topic: "任意 HTML" });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.fieldErrors.topic, "请选择有效的合作方向。");
});

test("inquiry validation enforces every text boundary and a UUID", () => {
  const cases = [
    ["submissionId", "not-a-uuid", "请重新载入表单后再提交。"],
    ["name", "名", "称呼需为 2–60 个字符。"],
    ["name", "名".repeat(61), "称呼需为 2–60 个字符。"],
    ["contact", "ab", "联系方式需为 3–120 个字符。"],
    ["contact", "a".repeat(121), "联系方式需为 3–120 个字符。"],
    ["message", "短".repeat(9), "留言需为 10–2000 个字符。"],
    ["message", "长".repeat(2001), "留言需为 10–2000 个字符。"],
  ];

  for (const [field, value, message] of cases) {
    const result = validateInquiry({ ...validInquiry, [field]: value });
    assert.equal(result.ok, false, field);
    assert.equal(result.fieldErrors[field], message, field);
  }
});

test("a filled honeypot is identified without exposing a validation error", () => {
  const result = validateInquiry({ ...validInquiry, website: "https://spam.invalid" });

  assert.equal(result.ok, true);
  assert.equal(result.honeypot, true);
  assert.deepEqual(result.value, {
    submissionId: validInquiry.submissionId,
    name: "访客",
    contact: "visitor@example.com",
    topic: "网站与数字体验",
    message: "希望讨论一个完整的品牌网站合作项目。",
  });
});

test("safeHttpsUrl normalizes HTTPS and rejects unsafe or oversized links", () => {
  assert.equal(safeHttpsUrl(" https://EXAMPLE.com:443/a/../work?q=1#demo "), "https://example.com/work?q=1#demo");
  assert.equal(safeHttpsUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpsUrl("http://example.com"), null);
  assert.equal(safeHttpsUrl("https://example.com/" + "a".repeat(2030)), null);
  assert.equal(safeHttpsUrl({}), null);
});

test("project validation normalizes a complete published project", () => {
  const result = validateProject(validPublishedProject);

  assert.deepEqual(result, {
    ok: true,
    value: {
      title: "StarVen 作品",
      summary: "一次完整的品牌表达。",
      category: "品牌网站",
      year: 2026,
      coverKey: "covers/550e8400-e29b-41d4-a716-446655440000.webp",
      coverContentType: "image/webp",
      coverWidth: 1600,
      coverHeight: 900,
      externalUrl: "https://example.com/work?a=1",
      status: "published",
      sortOrder: 4,
    },
  });
});

test("project validation permits incomplete drafts with safe defaults", () => {
  const result = validateProject({ title: "草稿" });

  assert.deepEqual(result, {
    ok: true,
    value: {
      title: "草稿",
      summary: "",
      category: "",
      year: null,
      coverKey: null,
      coverContentType: null,
      coverWidth: null,
      coverHeight: null,
      externalUrl: "",
      status: "draft",
      sortOrder: 0,
    },
  });
});

test("published projects require all public fields and safe cover metadata", () => {
  const result = validateProject({ title: "作品", status: "published" });

  assert.equal(result.ok, false);
  assert.deepEqual(Object.keys(result.fieldErrors).sort(), [
    "category",
    "coverContentType",
    "coverHeight",
    "coverKey",
    "coverWidth",
    "externalUrl",
    "summary",
    "year",
  ]);
});

test("project validation enforces text, year, order, URL, and supplied media bounds", () => {
  const cases = [
    ["title", "", "标题需为 1–120 个字符。"],
    ["title", "题".repeat(121), "标题需为 1–120 个字符。"],
    ["summary", "摘".repeat(1001), "简介不能超过 1000 个字符。"],
    ["category", "类".repeat(81), "分类不能超过 80 个字符。"],
    ["year", 1899, "年份需为 1900–2100 的整数。"],
    ["year", 2026.5, "年份需为 1900–2100 的整数。"],
    ["sortOrder", 2147483648, "排序值需为 32 位整数。"],
    ["externalUrl", "javascript:alert(1)", "作品链接需为不超过 2048 个字符的 HTTPS 地址。"],
    ["coverContentType", "image/gif", "封面格式仅支持 JPG、PNG 或 WebP。"],
    ["coverWidth", 0, "封面宽度需为正整数。"],
    ["coverHeight", -1, "封面高度需为正整数。"],
  ];

  for (const [field, value, message] of cases) {
    const result = validateProject({ ...validPublishedProject, status: "draft", [field]: value });
    assert.equal(result.ok, false, field);
    assert.equal(result.fieldErrors[field], message, field);
  }
});

test("drafts reject malformed supplied media values instead of treating them as omitted", () => {
  const cases = [
    ["coverKey", { key: "covers/not-a-string.webp" }, "封面对象键需为文本。"],
    ["coverContentType", 123, "封面格式仅支持 JPG、PNG 或 WebP。"],
    ["externalUrl", { href: "https://example.com" }, "作品链接需为不超过 2048 个字符的 HTTPS 地址。"],
  ];

  for (const [field, value, message] of cases) {
    const result = validateProject({ title: "草稿", [field]: value });
    assert.equal(result.ok, false, field);
    assert.equal(result.fieldErrors[field], message, field);
  }
});

test("drafts reject supplied non-string summary and category values", () => {
  const cases = [
    ["summary", {}, "简介需为文本。"],
    ["category", [], "分类需为文本。"],
  ];

  for (const [field, value, message] of cases) {
    const result = validateProject({ title: "草稿", [field]: value });
    assert.equal(result.ok, false, field);
    assert.equal(result.fieldErrors[field], message, field);
  }
});
