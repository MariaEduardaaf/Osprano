import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DETAILS_FIELDS_FULL,
  DETAILS_FIELDS_LIST,
  TEXT_SEARCH_FIELDS,
  fieldMask,
  skuForFields,
  toPlaceLite,
} from "../convex/lib/placesFields.ts";

test("SKU por máscara", () => {
  assert.equal(skuForFields(DETAILS_FIELDS_LIST), "pro");
  assert.equal(skuForFields(DETAILS_FIELDS_FULL), "enterprise");
  assert.equal(skuForFields(["id"]), "essentials_ids");
  assert.throws(() => skuForFields(["reviews"]));
});

test("nenhuma máscara pede avaliações, fotos ou localização", () => {
  for (const f of [...DETAILS_FIELDS_LIST, ...DETAILS_FIELDS_FULL, ...TEXT_SEARCH_FIELDS]) {
    assert.doesNotMatch(f, /review|photo|atmosphere|editorial|location/i, f);
  }
});

test("Text Search", () => {
  assert.ok(TEXT_SEARCH_FIELDS.includes("places.id"));
  assert.ok(TEXT_SEARCH_FIELDS.includes("nextPageToken"));
  assert.ok(!TEXT_SEARCH_FIELDS.includes("places.primaryType"));
  assert.equal(fieldMask(DETAILS_FIELDS_LIST), "displayName,formattedAddress");
});

test("toPlaceLite", () => {
  const r = toPlaceLite({
    displayName: { text: "X" }, formattedAddress: "Rua 1", nationalPhoneNumber: "01",
    websiteUri: "https://x", rating: 4.5, userRatingCount: 10, businessStatus: "OPERATIONAL", id: "abc",
  });
  assert.deepEqual(r, {
    name: "X", address: "Rua 1", phone: "01", website: "https://x", rating: 4.5, reviewsCount: 10, businessStatus: "OPERATIONAL",
  });
  assert.equal(Object.keys(toPlaceLite({})).length, 0);
  assert.deepEqual(toPlaceLite(null), {});
});
