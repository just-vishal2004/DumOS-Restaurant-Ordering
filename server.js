const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const domain = require("./lib/domain");
const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, "data", "orders.json");
const menu = domain.menu.map((m) => ({
  ...m,
  category: m.id.includes("biryani")
    ? "Biryani"
    : m.id === "pepper-chicken"
      ? "Small plates"
      : m.id === "gulab-jamun"
        ? "Dessert"
        : "Drinks",
  detail: {
    "chicken-biryani": "Aged basmati · saffron · slow dum",
    "paneer-biryani": "Charred paneer · mint · basmati",
    "pepper-chicken": "Curry leaf · cracked pepper · lime",
    "gulab-jamun": "Two pieces · cardamom syrup",
    "mango-lassi": "Alphonso · cultured yoghurt",
  }[m.id],
  tag: {
    "chicken-biryani": "HOUSE FAVOURITE",
    "paneer-biryani": "VEGETARIAN",
    "pepper-chicken": "SPICY",
    "gulab-jamun": "SWEET FINISH",
    "mango-lassi": "COOL & CREAMY",
  }[m.id],
}));
const statuses = domain.statuses;
function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}
let orders = readOrders();
const clients = new Set();
function broadcast() {
  const payload = `data: ${JSON.stringify({ orders })}\n\n`;
  for (const c of clients) c.write(payload);
}
function json(res, code, data) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const temporaryFile = FILE + ".tmp";
  fs.writeFileSync(temporaryFile, JSON.stringify(orders, null, 2));
  fs.renameSync(temporaryFile, FILE);
  broadcast();
}
function estimate(items) {
  return domain.estimate(
    items,
    orders.filter((o) => ["placed", "preparing"].includes(o.status)).length,
  );
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  if (req.method === "GET" && p === "/api/menu")
    return json(res, 200, {
      outlet: {
        id: "indiranagar",
        name: "Dum House · Demo outlet",
        address: "Indiranagar, Bengaluru",
      },
      menu,
    });
  if (req.method === "GET" && p === "/api/orders")
    return json(res, 200, { orders });
  if (req.method === "GET" && p === "/api/estimate") {
    const ids = url.searchParams.get("items");
    let items = [];
    try {
      items = JSON.parse(ids || "[]");
    } catch {}
    return json(res, 200, {
      minutes: estimate(items),
      basis: "Items + active kitchen queue",
      fallback: items.length === 0,
    });
  }
  if (req.method === "GET" && p === "/api/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(`data: ${JSON.stringify({ orders })}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }
  if (req.method === "POST" && p === "/api/orders") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        if (
          typeof data.customer !== "string" ||
          data.customer.trim().length < 2 ||
          data.customer.length > 60
        )
          throw Error("Enter a name between 2 and 60 characters.");
        const clean = domain.normalizeItems(data.items);
        const order = {
          id: randomUUID(),
          number: String(
            Math.max(0, ...orders.map((o) => Number(o.number) || 0)) + 1,
          ).padStart(5, "0"),
          customer: data.customer.trim(),
          items: clean,
          total: domain.total(clean),
          status: "placed",
          createdAt: new Date().toISOString(),
          estimate: estimate(clean),
        };
        orders.unshift(order);
        save();
        json(res, 201, { order });
      } catch (e) {
        json(res, 400, { error: e.message });
      }
    });
    return;
  }
  const match = p.match(/^\/api\/orders\/([\w-]+)\/status$/);
  if (req.method === "PATCH" && match) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { status } = JSON.parse(body);
        const o = orders.find((o) => o.id === match[1]);
        if (!o) return json(res, 404, { error: "Order not found." });
        if (!domain.canTransition(o.status, status))
          return json(res, 409, {
            error: "Orders can only move to the next kitchen stage.",
          });
        o.status = status;
        o.updatedAt = new Date().toISOString();
        save();
        json(res, 200, { order: o });
      } catch (e) {
        json(res, 400, { error: "Invalid status update." });
      }
    });
    return;
  }
  if (req.method === "GET") {
    let file = p === "/" ? "index.html" : p.slice(1);
    const full = path.join(__dirname, "public", file);
    if (
      full.startsWith(path.join(__dirname, "public")) &&
      fs.existsSync(full)
    ) {
      res.writeHead(200, {
        "Content-Type": file.endsWith(".css")
          ? "text/css"
          : file.endsWith(".js")
            ? "text/javascript"
            : "text/html",
      });
      return fs.createReadStream(full).pipe(res);
    }
  }
  json(res, 404, { error: "Not found." });
});
server.listen(PORT, () =>
  console.log(`DumOS running at http://localhost:${PORT}`),
);
