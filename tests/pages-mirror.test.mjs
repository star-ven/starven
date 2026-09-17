import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl = new URL("../pages/index.html", import.meta.url);

test("the public mirror is a self-contained, indexable StarVen page", async () => {
  const html = await readFile(pageUrl, "utf8");

  assert.match(html, /<title>StarVen[^<]*<\/title>/i);
  assert.match(html, /name="description" content="[^"]+"/i);
  assert.match(html, /<main[\s>]/i);
  assert.match(html, /id="home"/i);
  assert.match(html, /id="contact"/i);
  assert.doesNotMatch(html, /workers\.dev/i);
  assert.match(html, /href="\.\/styles\.css"/i);
  assert.match(html, /src="\.\/app\.js"/i);
  assert.match(html, /src="\.\/assets\/starven-avatar\.png"/i);
});

test("the mirror support files are present and do not block search indexing", async () => {
  const [styles, script, robots, sitemap] = await Promise.all([
    readFile(new URL("../pages/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../pages/app.js", import.meta.url), "utf8"),
    readFile(new URL("../pages/robots.txt", import.meta.url), "utf8"),
    readFile(new URL("../pages/sitemap.xml", import.meta.url), "utf8"),
  ]);

  assert.ok(styles.length > 1000, "expected the branded stylesheet to be included");
  assert.match(script, /IntersectionObserver/);
  assert.match(robots, /User-agent:\s*\*/i);
  assert.match(robots, /Allow:\s*\//i);
  assert.doesNotMatch(robots, /Disallow:\s*\//i);
  assert.match(sitemap, /https:\/\/star-ven\.github\.io\/starven\//i);
});
