const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { listProducts, PRODUCTS } = require("../src/products");

describe("products catalog", () => {
  it("includes VRAXTAL VAULT as flagship product", () => {
    const vault = PRODUCTS.find((p) => p.id === "vraxtal-vault");
    assert.ok(vault);
    assert.equal(vault.kind, "product");
    assert.equal(vault.status, "flagship");
    assert.match(vault.url, /vraxtal-vault/);
  });

  it("lists tools and products in summary", () => {
    const catalog = listProducts();
    assert.equal(catalog.summary.flagship, "vraxtal-vault");
    assert.ok(catalog.summary.products >= 1);
    assert.ok(catalog.summary.tools >= 3);
    assert.equal(catalog.products.length, PRODUCTS.length);
  });

  it("filters by kind", () => {
    const onlyProducts = listProducts({ kind: "product" });
    assert.ok(onlyProducts.products.every((p) => p.kind === "product"));
    const onlyTools = listProducts({ kind: "tool" });
    assert.ok(onlyTools.products.every((p) => p.kind === "tool"));
  });
});
