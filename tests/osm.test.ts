import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORY_OPTIONS } from "../convex/lib/domain.ts";
import {
  osmTagsForCategory,
  buildOverpassQuery,
  osmElementToLead,
  rankForOutreach,
  shouldRetryOverpass,
  overpassErrorMessage,
} from "../convex/lib/osm.ts";

// ---------------------------------------------------------------------------
// osmTagsForCategory
// ---------------------------------------------------------------------------

test("osmTagsForCategory: toda categoria do select tem pelo menos um filtro OSM", () => {
  for (const { value } of CATEGORY_OPTIONS) {
    const filters = osmTagsForCategory(value);
    assert.ok(filters.length >= 1, `categoria sem filtro OSM: ${value}`);
    for (const f of filters) {
      assert.ok(Object.keys(f).length >= 1, `filtro vazio em ${value}`);
    }
  }
});

test("osmTagsForCategory: mapeamentos representativos", () => {
  assert.deepEqual(osmTagsForCategory("restaurant"), [{ amenity: "restaurant" }]);
  assert.deepEqual(osmTagsForCategory("pizza restaurant"), [
    { amenity: "restaurant", cuisine: "pizza" },
  ]);
  assert.deepEqual(osmTagsForCategory("barber shop"), [{ shop: "hairdresser" }]);
  assert.deepEqual(osmTagsForCategory("spa"), [{ shop: "massage" }, { leisure: "spa" }]);
  assert.deepEqual(osmTagsForCategory("doctor"), [{ amenity: "doctors" }, { amenity: "clinic" }]);
  assert.deepEqual(osmTagsForCategory("laundry"), [{ shop: "laundry" }, { shop: "dry_cleaning" }]);
});

test("osmTagsForCategory: categoria desconhecida → []", () => {
  assert.deepEqual(osmTagsForCategory("spaceport"), []);
  assert.deepEqual(osmTagsForCategory(""), []);
});

// ---------------------------------------------------------------------------
// buildOverpassQuery
// ---------------------------------------------------------------------------

test("buildOverpassQuery: escopo por área, um nwr por filtro, limite no lugar", () => {
  const q = buildOverpassQuery(
    { areaId: 3600146656 },
    [{ amenity: "restaurant" }, { shop: "bakery" }],
    40,
  );
  assert.equal(
    q,
    '[out:json][timeout:25];area(3600146656)->.a;(nwr["amenity"="restaurant"](area.a);nwr["shop"="bakery"](area.a););out center tags 40;',
  );
});

test("buildOverpassQuery: escopo por raio (cidade sem relation) usa around: sem área", () => {
  const q = buildOverpassQuery(
    { lat: 50.8214, lon: -0.1400, radius: 8000 },
    [{ amenity: "cafe" }],
    200,
  );
  assert.equal(
    q,
    '[out:json][timeout:25];(nwr["amenity"="cafe"](around:8000,50.8214,-0.14););out center tags 200;',
  );
  assert.ok(!q.includes("area("));
});

test("buildOverpassQuery: filtro com duas tags vira AND no mesmo nwr", () => {
  const q = buildOverpassQuery({ areaId: 1 }, [{ amenity: "restaurant", cuisine: "pizza" }], 5);
  assert.ok(q.includes('nwr["amenity"="restaurant"]["cuisine"="pizza"](area.a);'));
});

test("buildOverpassQuery: escapa aspas e barra invertida nos valores", () => {
  const q = buildOverpassQuery({ areaId: 1 }, [{ name: 'a"b\\c' }], 1);
  assert.ok(q.includes('["name"="a\\"b\\\\c"]'));
});

// ---------------------------------------------------------------------------
// osmElementToLead
// ---------------------------------------------------------------------------

test("osmElementToLead: elemento completo", () => {
  const lead = osmElementToLead(
    {
      type: "node",
      id: 123,
      tags: {
        name: "Barbearia do Zé",
        phone: "+44 161 000 0000",
        website: "https://ze.example",
        email: "hi@ze.example",
        "addr:street": "Oxford Road",
        "addr:housenumber": "12",
        "addr:postcode": "M1 5AN",
        "addr:city": "Manchester",
      },
    },
    "Fallback",
  );
  assert.deepEqual(lead, {
    placeId: "osm:node/123",
    name: "Barbearia do Zé",
    address: "Oxford Road 12, M1 5AN Manchester",
    city: "Manchester",
    phone: "+44 161 000 0000",
    website: "https://ze.example",
    email: "hi@ze.example",
  });
});

test("osmElementToLead: sem name → null", () => {
  assert.equal(osmElementToLead({ type: "node", id: 1, tags: { amenity: "bar" } }, "X"), null);
  assert.equal(osmElementToLead({ type: "node", id: 1, tags: { name: "  " } }, "X"), null);
  assert.equal(osmElementToLead({ type: "node", id: 1 }, "X"), null);
});

test("osmElementToLead: fallbacks contact:* e cidade da busca", () => {
  const lead = osmElementToLead(
    {
      type: "way",
      id: 77,
      tags: {
        name: "Café X",
        "contact:phone": "0161 111",
        "contact:website": "cafex.example",
        "contact:email": "info@cafex.example",
      },
    },
    "Manchester",
  );
  assert.ok(lead);
  assert.equal(lead.placeId, "osm:way/77");
  assert.equal(lead.city, "Manchester");
  assert.equal(lead.phone, "0161 111");
  assert.equal(lead.website, "cafex.example");
  assert.equal(lead.email, "info@cafex.example");
  assert.equal(lead.address, undefined);
});

test("osmElementToLead: tag direta vence contact:*", () => {
  const lead = osmElementToLead(
    {
      type: "relation",
      id: 9,
      tags: { name: "Y", phone: "A", "contact:phone": "B", website: "w1", "contact:website": "w2" },
    },
    "C",
  );
  assert.ok(lead);
  assert.equal(lead.placeId, "osm:relation/9");
  assert.equal(lead.phone, "A");
  assert.equal(lead.website, "w1");
});

test("osmElementToLead: endereço parcial compõe só o que existe", () => {
  const onlyStreet = osmElementToLead(
    { type: "node", id: 1, tags: { name: "N", "addr:street": "High St" } },
    "Leeds",
  );
  assert.equal(onlyStreet?.address, "High St");
  assert.equal(onlyStreet?.city, "Leeds");

  const onlyPostcodeCity = osmElementToLead(
    { type: "node", id: 2, tags: { name: "N", "addr:postcode": "LS1", "addr:city": "Leeds" } },
    "Other",
  );
  assert.equal(onlyPostcodeCity?.address, "LS1 Leeds");
  assert.equal(onlyPostcodeCity?.city, "Leeds");

  const onlyNumber = osmElementToLead(
    { type: "node", id: 3, tags: { name: "N", "addr:housenumber": "5" } },
    "Leeds",
  );
  assert.equal(onlyNumber?.address, "5");
});

// ---------------------------------------------------------------------------
// rankForOutreach
// ---------------------------------------------------------------------------

test("rankForOutreach: sem site primeiro, depois com telefone; estável nos empates", () => {
  const input = [
    { id: "a", website: "https://a", phone: "1" },
    { id: "b" },
    { id: "c", phone: "3" },
    { id: "d", website: "https://d" },
    { id: "e", phone: "5" },
    { id: "f" },
  ];
  const out = rankForOutreach(input).map((l) => l.id);
  assert.deepEqual(out, ["c", "e", "b", "f", "a", "d"]);
});

test("rankForOutreach: não muta a entrada", () => {
  const input = [{ id: "a", website: "x" }, { id: "b" }];
  const copy = [...input];
  rankForOutreach(input);
  assert.deepEqual(input, copy);
});

// ---------------------------------------------------------------------------
// retentativa do Overpass
// ---------------------------------------------------------------------------

test("shouldRetryOverpass: só 429/503/504 são retentáveis", () => {
  assert.equal(shouldRetryOverpass(429), true);
  assert.equal(shouldRetryOverpass(503), true);
  assert.equal(shouldRetryOverpass(504), true);
  assert.equal(shouldRetryOverpass(200), false);
  assert.equal(shouldRetryOverpass(400), false);
  assert.equal(shouldRetryOverpass(500), false);
});

test("overpassErrorMessage: ocupado vs. erro de verdade", () => {
  assert.equal(
    overpassErrorMessage(504),
    "Overpass ocupado agora (HTTP 504); tente de novo em alguns segundos.",
  );
  assert.equal(overpassErrorMessage(400), "Overpass respondeu 400");
});
