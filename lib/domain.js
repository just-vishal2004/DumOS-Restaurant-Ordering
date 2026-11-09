const menu = [
  { id: "chicken-biryani", name: "Dum chicken biryani", price: 329, prep: 18 },
  { id: "paneer-biryani", name: "Paneer tikka biryani", price: 289, prep: 16 },
  { id: "pepper-chicken", name: "Pepper chicken", price: 249, prep: 12 },
  { id: "gulab-jamun", name: "Warm gulab jamun", price: 99, prep: 5 },
  { id: "mango-lassi", name: "Mango lassi", price: 89, prep: 3 },
];
const statuses = ["placed", "preparing", "ready", "completed"];
function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0)
    throw Error("Add at least one item.");
  const clean = [];
  for (const i of items) {
    const m = menu.find((x) => x.id === i.id),
      q = Number(i.quantity);
    if (!m || !Number.isInteger(q) || q < 1 || q > 10)
      throw Error("An item or quantity is invalid.");
    clean.push({ id: m.id, name: m.name, price: m.price, quantity: q });
  }
  return clean;
}
function total(items) {
  return items.reduce((n, i) => n + i.price * i.quantity, 0);
}
function estimate(items, active = 0) {
  const mins = items.reduce(
    (sum, item) =>
      sum + (menu.find((m) => m.id === item.id)?.prep || 8) * item.quantity,
    0,
  );
  return Math.max(20, Math.min(55, Math.ceil(mins / 2 + active * 4 + 8)));
}
function canTransition(from, to) {
  return (
    statuses.indexOf(to) === statuses.indexOf(from) + 1 && statuses.includes(to)
  );
}
module.exports = {
  menu,
  statuses,
  normalizeItems,
  total,
  estimate,
  canTransition,
};
