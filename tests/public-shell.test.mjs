import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("Vinext shell preserves the StarVen public contract", async () => {
  const page = await readFile(new URL("../components/public-site.tsx", import.meta.url), "utf8");
  const manifest = JSON.parse(await readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
  assert.equal(manifest.project_id, "appgprj_6aaa708c660c81918475cf942939d9ca");
  assert.equal(manifest.d1, "DB");
  assert.equal(manifest.r2, "BUCKET");
  assert.equal("static" in manifest, false);
  for (const id of ["home", "about", "capabilities", "archive", "contact"]) {
    assert.match(page, new RegExp(`id=["']${id}["']`));
  }
  await stat(new URL("../public/assets/starven-avatar.png", import.meta.url));
});
