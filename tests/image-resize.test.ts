import { test } from "node:test";
import assert from "node:assert/strict";
import { ACCEPT, MAX_UPLOAD_BYTES, checkFile, targetSize } from "../src/lib/image-resize.ts";

test("image-resize: targetSize limita o lado maior, mantém a proporção e nunca amplia", () => {
  assert.deepEqual(targetSize(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(targetSize(3000, 4000, 1600), { width: 1200, height: 1600 });
  assert.deepEqual(targetSize(1600, 900, 1600), { width: 1600, height: 900 });
  assert.deepEqual(targetSize(800, 600, 1600), { width: 800, height: 600 });
  // panorama extremo: o lado menor arredonda mas nunca chega a zero
  assert.deepEqual(targetSize(10000, 1, 1600), { width: 1600, height: 1 });
  assert.deepEqual(targetSize(3333, 2222, 1600), { width: 1600, height: 1067 });
});

test("image-resize: checkFile recusa tipo fora de jpeg/png/webp e arquivo acima de 10 MB", () => {
  assert.equal(checkFile({ size: 1000, type: "image/jpeg" }), null);
  assert.equal(checkFile({ size: 1000, type: "image/png" }), null);
  assert.equal(checkFile({ size: 1000, type: "image/webp" }), null);
  assert.equal(checkFile({ size: MAX_UPLOAD_BYTES, type: "image/jpeg" }), null);
  assert.match(checkFile({ size: MAX_UPLOAD_BYTES + 1, type: "image/jpeg" }) ?? "", /10 MB/);
  assert.match(checkFile({ size: 1000, type: "image/gif" }) ?? "", /JPEG, PNG ou WebP/);
  assert.match(checkFile({ size: 1000, type: "image/heic" }) ?? "", /JPEG, PNG ou WebP/);
  assert.match(checkFile({ size: 1000, type: "" }) ?? "", /JPEG, PNG ou WebP/);
  // tipo errado E grande: o tipo é o primeiro motivo (nada de processar antes de recusar)
  assert.match(checkFile({ size: MAX_UPLOAD_BYTES + 1, type: "text/plain" }) ?? "", /JPEG/);
  assert.equal(ACCEPT, "image/jpeg,image/png,image/webp");
});
