import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("production proxy admits bounded OAuth response headers without buffering streamed pages", async (): Promise<void> => {
  const source = await readFile(
    new URL("../deploy/nginx.conf", import.meta.url),
    "utf8",
  );
  const proxy = source.slice(
    source.indexOf("proxy_pass http://127.0.0.1:19320;"),
  );
  assert.match(proxy, /proxy_buffer_size\s+16k;/);
  assert.match(proxy, /proxy_buffers\s+8\s+16k;/);
  assert.match(proxy, /proxy_busy_buffers_size\s+32k;/);
  assert.match(proxy, /proxy_buffering\s+off;/);
  assert.match(proxy, /proxy_set_header Host www\.wowforeverdiscord\.online;/);
  assert.match(proxy, /proxy_set_header X-Forwarded-Proto https;/);
  assert.match(source, /client_max_body_size 21m;/);
  assert.match(source, /client_body_timeout 20s;/);
});
