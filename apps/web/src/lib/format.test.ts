import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGelToTetri } from "./format.ts";

test("parseGelToTetri: whole lari", () => {
  assert.equal(parseGelToTetri("220"), 22000);
  assert.equal(parseGelToTetri("0"), 0);
  assert.equal(parseGelToTetri("007"), 700);
  assert.equal(parseGelToTetri("9999999"), 999999900);
});

test("parseGelToTetri: decimals", () => {
  assert.equal(parseGelToTetri("220.50"), 22050);
  assert.equal(parseGelToTetri("220.5"), 22050);
  assert.equal(parseGelToTetri("220.05"), 22005);
  assert.equal(parseGelToTetri("220,50"), 22050);
  // 0.29 * 100 = 28.999999999999996 with floats
  assert.equal(parseGelToTetri("0.29"), 29);
  assert.equal(parseGelToTetri("1.15"), 115);
  assert.equal(parseGelToTetri("4.35"), 435);
});

test("parseGelToTetri: trims whitespace", () => {
  assert.equal(parseGelToTetri("  220.50 "), 22050);
});

test("parseGelToTetri: invalid input", () => {
  for (const input of [
    "",
    " ",
    ".",
    ".5",
    "220.",
    "220.505",
    "-220",
    "+220",
    "1e3",
    "220 50",
    "1,000.00",
    "220₾",
    "abc",
    "10000000",
  ]) {
    assert.equal(parseGelToTetri(input), null, JSON.stringify(input));
  }
});
