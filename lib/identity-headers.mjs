const sitesUserIdHeader = "oai-authenticated-user-id";
const sitesEmailHeader = "oai-authenticated-user-email";
const sitesFullNameHeader = "oai-authenticated-user-full-name";
const sitesFullNameEncodingHeader = "oai-authenticated-user-full-name-encoding";
const cloudflareAccessEmailHeader = "cf-access-authenticated-user-email";

export function readAuthenticatedIdentity(headers) {
  const sitesUserId = headers.get(sitesUserIdHeader);
  const sitesEmail = headers.get(sitesEmailHeader);
  if (sitesUserId && sitesEmail) {
    const encodedFullName = headers.get(sitesFullNameHeader);
    const fullName = encodedFullName &&
      headers.get(sitesFullNameEncodingHeader) === "percent-encoded-utf-8"
        ? safeDecodeURIComponent(encodedFullName)
        : null;
    return { userId: sitesUserId, email: sitesEmail, fullName, provider: "sites" };
  }

  const cloudflareEmail = headers.get(cloudflareAccessEmailHeader)?.trim();
  if (cloudflareEmail) {
    return {
      userId: cloudflareEmail,
      email: cloudflareEmail,
      fullName: null,
      provider: "cloudflare-access",
    };
  }
  return null;
}

function safeDecodeURIComponent(value) {
  try { return decodeURIComponent(value); }
  catch { return null; }
}
