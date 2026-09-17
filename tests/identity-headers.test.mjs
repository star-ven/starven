import test from "node:test";
import assert from "node:assert/strict";

import {
  configuredAdminIdentifier,
  readAuthenticatedIdentity,
} from "../lib/identity-headers.mjs";

test("reads the original Sites identity headers", () => {
  const identity = readAuthenticatedIdentity(
    new Headers({
      "oai-authenticated-user-id": "owner-id",
      "oai-authenticated-user-email": "owner@example.com",
      "oai-authenticated-user-full-name": "StarVen",
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    }),
  );

  assert.deepEqual(identity, {
    userId: "owner-id",
    email: "owner@example.com",
    fullName: "StarVen",
    provider: "sites",
  });
});

test("reads a Cloudflare Access identity and uses the email as the stable admin id", () => {
  const identity = readAuthenticatedIdentity(
    new Headers({
      "cf-access-authenticated-user-email": "owner@example.com",
    }),
  );

  assert.deepEqual(identity, {
    userId: "owner@example.com",
    email: "owner@example.com",
    fullName: null,
    provider: "cloudflare-access",
  });
});

test("does not accept untrusted visitor headers", () => {
  const identity = readAuthenticatedIdentity(
    new Headers({
      "x-user-email": "attacker@example.com",
      "cf-connecting-ip": "203.0.113.10",
    }),
  );

  assert.equal(identity, null);
});

test("selects the provider-specific configured administrator identifier", () => {
  const environment = {
    ADMIN_USER_ID: "sites-owner-id",
    ADMIN_CONTACT_EMAIL: "owner@example.com",
  };

  assert.equal(configuredAdminIdentifier("sites", environment), "sites-owner-id");
  assert.equal(
    configuredAdminIdentifier("cloudflare-access", environment),
    "owner@example.com",
  );
});
