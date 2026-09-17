export const INQUIRY_TOPICS = Object.freeze([
  "AI 视频与影像",
  "网站与数字体验",
  "视觉与品牌设计",
  "内容策划与运营",
  "项目管理与顾问",
  "其他",
]);

const INQUIRY_TOPIC_SET = new Set(INQUIRY_TOPICS);
const COVER_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

function objectPayload(payload) {
  return payload !== null && typeof payload === "object" && !Array.isArray(payload)
    ? payload
    : {};
}

function trimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function characterLength(value) {
  return [...value].length;
}

function optionalString(value) {
  const normalized = trimmedString(value);
  return normalized === "" ? null : normalized;
}

function optionalInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function safeHttpsUrl(value) {
  if (typeof value !== "string") return null;

  const candidate = value.trim();
  if (candidate === "") return null;

  try {
    const normalized = new URL(candidate);
    if (normalized.protocol !== "https:" || normalized.href.length > 2048) return null;
    return normalized.href;
  } catch {
    return null;
  }
}

export function validateInquiry(payload) {
  const input = objectPayload(payload);
  const value = {
    submissionId: trimmedString(input.submissionId),
    name: trimmedString(input.name),
    contact: trimmedString(input.contact),
    topic: trimmedString(input.topic),
    message: trimmedString(input.message),
  };

  if (trimmedString(input.website) !== "") {
    return { ok: true, honeypot: true, value };
  }

  const fieldErrors = {};
  if (!UUID_PATTERN.test(value.submissionId)) {
    fieldErrors.submissionId = "请重新载入表单后再提交。";
  }

  const nameLength = characterLength(value.name);
  if (nameLength < 2 || nameLength > 60) {
    fieldErrors.name = "称呼需为 2–60 个字符。";
  }

  const contactLength = characterLength(value.contact);
  if (contactLength < 3 || contactLength > 120) {
    fieldErrors.contact = "联系方式需为 3–120 个字符。";
  }

  if (!INQUIRY_TOPIC_SET.has(value.topic)) {
    fieldErrors.topic = "请选择有效的合作方向。";
  }

  const messageLength = characterLength(value.message);
  if (messageLength < 10 || messageLength > 2000) {
    fieldErrors.message = "留言需为 10–2000 个字符。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, honeypot: false, value };
}

export function validateProject(payload) {
  const input = objectPayload(payload);
  const title = trimmedString(input.title);
  const summary = trimmedString(input.summary);
  const category = trimmedString(input.category);
  const year = optionalInteger(input.year);
  const coverKey = optionalString(input.coverKey);
  const coverContentType = optionalString(input.coverContentType);
  const coverWidth = optionalInteger(input.coverWidth);
  const coverHeight = optionalInteger(input.coverHeight);
  const rawExternalUrl = optionalString(input.externalUrl);
  const externalUrl = rawExternalUrl === null ? "" : safeHttpsUrl(rawExternalUrl);
  const status = input.status === undefined || input.status === null || input.status === ""
    ? "draft"
    : input.status;
  const sortOrder = input.sortOrder === undefined || input.sortOrder === null || input.sortOrder === ""
    ? 0
    : input.sortOrder;
  const fieldErrors = {};

  const titleLength = characterLength(title);
  if (titleLength < 1 || titleLength > 120) {
    fieldErrors.title = "标题需为 1–120 个字符。";
  }
  if (input.summary !== undefined && typeof input.summary !== "string") {
    fieldErrors.summary = "简介需为文本。";
  } else if (characterLength(summary) > 1000) {
    fieldErrors.summary = "简介不能超过 1000 个字符。";
  }
  if (input.category !== undefined && typeof input.category !== "string") {
    fieldErrors.category = "分类需为文本。";
  } else if (characterLength(category) > 80) {
    fieldErrors.category = "分类不能超过 80 个字符。";
  }
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
    fieldErrors.year = "年份需为 1900–2100 的整数。";
  }
  if (input.externalUrl !== undefined && input.externalUrl !== null && typeof input.externalUrl !== "string") {
    fieldErrors.externalUrl = "作品链接需为不超过 2048 个字符的 HTTPS 地址。";
  } else if (rawExternalUrl !== null && externalUrl === null) {
    fieldErrors.externalUrl = "作品链接需为不超过 2048 个字符的 HTTPS 地址。";
  }
  if (status !== "draft" && status !== "published") {
    fieldErrors.status = "请选择有效的作品状态。";
  }
  if (!Number.isInteger(sortOrder) || sortOrder < INT32_MIN || sortOrder > INT32_MAX) {
    fieldErrors.sortOrder = "排序值需为 32 位整数。";
  }
  if (input.coverKey !== undefined && input.coverKey !== null && typeof input.coverKey !== "string") {
    fieldErrors.coverKey = "封面对象键需为文本。";
  }
  if (
    input.coverContentType !== undefined &&
    input.coverContentType !== null &&
    typeof input.coverContentType !== "string"
  ) {
    fieldErrors.coverContentType = "封面格式仅支持 JPG、PNG 或 WebP。";
  } else if (coverContentType !== null && !COVER_CONTENT_TYPES.has(coverContentType)) {
    fieldErrors.coverContentType = "封面格式仅支持 JPG、PNG 或 WebP。";
  }
  if (coverWidth !== null && (!Number.isInteger(coverWidth) || coverWidth <= 0)) {
    fieldErrors.coverWidth = "封面宽度需为正整数。";
  }
  if (coverHeight !== null && (!Number.isInteger(coverHeight) || coverHeight <= 0)) {
    fieldErrors.coverHeight = "封面高度需为正整数。";
  }

  if (status === "published") {
    if (summary === "") fieldErrors.summary = "发布前请填写简介。";
    if (category === "") fieldErrors.category = "发布前请填写分类。";
    if (year === null) fieldErrors.year = "发布前请填写年份。";
    if (coverKey === null) fieldErrors.coverKey = "发布前请上传封面。";
    if (coverContentType === null) fieldErrors.coverContentType = "发布前请上传有效封面。";
    if (coverWidth === null) fieldErrors.coverWidth = "发布前请上传有效封面。";
    if (coverHeight === null) fieldErrors.coverHeight = "发布前请上传有效封面。";
    if (rawExternalUrl === null) fieldErrors.externalUrl = "发布前请填写 HTTPS 作品链接。";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      title,
      summary,
      category,
      year,
      coverKey,
      coverContentType,
      coverWidth,
      coverHeight,
      externalUrl: externalUrl ?? "",
      status,
      sortOrder,
    },
  };
}
