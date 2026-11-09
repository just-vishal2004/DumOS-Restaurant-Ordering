const { test } = require("node:test");
const assert = require("node:assert/strict");
const d = require("../lib/domain");
test("validates basket contents and quantities", () => {
  assert.throws(() => d.normalizeItems([]), /at least one/);
  assert.throws(
    () => d.normalizeItems([{ id: "missing", quantity: 1 }]),
    /invalid/,
  );
  assert.throws(
    () => d.normalizeItems([{ id: "mango-lassi", quantity: 11 }]),
    /invalid/,
  );
  assert.deepEqual(d.normalizeItems([{ id: "chicken-biryani", quantity: 2 }]), [
    {
      id: "chicken-biryani",
      name: "Dum chicken biryani",
      price: 329,
      quantity: 2,
    },
  ]);
});
test("calculates totals and bounds estimates under load", () => {
  const items = d.normalizeItems([{ id: "chicken-biryani", quantity: 2 }]);
  assert.equal(d.total(items), 658);
  assert.equal(d.estimate(items), 26);
  assert.equal(d.estimate(items, 30), 55);
  assert.equal(d.estimate([], 0), 20);
});
test("permits only sequential kitchen status transitions", () => {
  assert.equal(d.canTransition("placed", "preparing"), true);
  assert.equal(d.canTransition("placed", "ready"), false);
  assert.equal(d.canTransition("ready", "completed"), true);
  assert.equal(d.canTransition("completed", "placed"), false);
});
