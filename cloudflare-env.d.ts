declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    BUCKET: R2Bucket;
    ADMIN_USER_ID?: string;
    ADMIN_CONTACT_EMAIL?: string;
    RATE_LIMIT_SALT?: string;
  }
}
