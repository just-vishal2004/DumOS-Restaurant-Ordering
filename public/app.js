const $ = (s) => document.querySelector(s);
let menu = [],
  basket = {},
  orders = [];
const money = (n) => "₹" + n.toLocaleString("en-IN");
function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}
const statuses = ["placed", "preparing", "ready", "completed"];
const labels = {
  placed: "New order",
  preparing: "Preparing",
  ready: "Ready for pickup",
  completed: "Completed",
};
async function api(url, options) {
  const r = await fetch(url, options);
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Something went wrong.");
  return d;
}
async function init() {
  try {
    const d = await api("/api/menu");
    menu = d.menu;
    $("#outlet").textContent = d.outlet.name;
    $("#outletAddress").textContent = d.outlet.address;
    $("#itemCount").textContent =
      String(menu.length).padStart(2, "0") + " DISHES";
    renderMenu();
    updateEstimate();
    const o = await api("/api/orders");
    orders = o.orders;
    renderOrders();
    const events = new EventSource("/api/events");
    events.onopen = () => {
      $("#syncStatus").textContent = "● Live";
    };
    events.onerror = () => {
      $("#syncStatus").textContent = "Reconnecting…";
    };
    events.onmessage = (e) => {
      orders = Array.from(
        new Map(JSON.parse(e.data).orders.map((o) => [o.id, o])).values(),
      );
      renderOrders();
    };
  } catch {
    $("#menu").innerHTML =
      '<p class="quiet">We could not load the menu. Refresh to try again.</p>';
  }
}
function renderMenu() {
  $("#menu").innerHTML = menu
    .map(
      (x) =>
        `<article class="dish"><div class="dish-main"><div class="dish-tag">${x.category.toUpperCase()} · ${x.prep} MIN PREP <span>${x.tag}</span></div><h3>${x.name}</h3><p>${x.detail}</p></div><div class="dish-side"><span class="price">${money(x.price)}</span><button class="add" data-add="${x.id}" aria-label="Add ${x.name}">Add</button></div></article>`,
    )
    .join("");
  document.querySelectorAll("[data-add]").forEach(
    (b) =>
      (b.onclick = () => {
        basket[b.dataset.add] = (basket[b.dataset.add] || 0) + 1;
        renderBasket();
        $("#cart").classList.add("open");
      }),
  );
}
function renderBasket() {
  const entries = Object.entries(basket).filter(([, q]) => q > 0);
  const qty = entries.reduce((a, [, q]) => a + q, 0),
    total = entries.reduce(
      (a, [id, q]) => a + menu.find((m) => m.id === id).price * q,
      0,
    );
  $("#cartCount").textContent = qty;
  $("#fabCount").textContent = qty;
  $("#total").textContent = money(total);
  $("#fabTotal").textContent = money(total);
  $("#cartItems").innerHTML = entries.length
    ? entries
        .map(([id, q]) => {
          const m = menu.find((x) => x.id === id);
          return `<div class="cart-row"><div class="cart-row-info"><strong>${m.name}</strong><span>${money(m.price)} each</span></div><div class="qty"><button data-q="${id}" data-d="-1">−</button><span>${q}</span><button data-q="${id}" data-d="1">+</button></div></div>`;
        })
        .join("")
    : '<p class="quiet">Add something lovely.</p>';
  document.querySelectorAll("[data-q]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.q;
        basket[id] += Number(b.dataset.d);
        if (basket[id] <= 0) delete basket[id];
        renderBasket();
      }),
  );
  updateEstimate();
}
async function updateEstimate() {
  try {
    const items = Object.entries(basket)
      .filter(([, quantity]) => quantity > 0)
      .map(([id, quantity]) => ({ id, quantity }));
    const d = await api(
      "/api/estimate?items=" + encodeURIComponent(JSON.stringify(items)),
    );
    $("#estimate").textContent = d.minutes;
    $("#estimateBasis").textContent = items.length
      ? "Estimate adjusts to items, queue and an 8 minute handoff buffer."
      : "Baseline includes minimum 20 minute safeguard; updates with basket and active queue.";
  } catch {
    $("#estimate").textContent = "20+";
    $("#estimateBasis").textContent =
      "Fallback estimate; kitchen load unavailable.";
  }
}
$("#openCart").onclick = () => $("#cart").classList.add("open");
$("#closeCart").onclick = () => $("#cart").classList.remove("open");
$("#checkout").onclick = async () => {
  const customer = $("#customer").value.trim(),
    items = Object.entries(basket).map(([id, quantity]) => ({ id, quantity }));
  $("#error").textContent = "";
  try {
    const d = await api("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ customer, items }),
    });
    orders = Array.from(
      new Map([d.order, ...orders].map((o) => [o.id, o])).values(),
    );
    basket = {};
    renderBasket();
    renderOrders();
    $("#cart").classList.remove("open");
    $("#track").scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (e) {
    $("#error").textContent = e.message;
  }
};
function renderOrders() {
  const current = orders.find((o) => o.status !== "completed");
  $("#trackBody").innerHTML = current
    ? `<div class="track-order"><strong>Order #${current.number} · ${labels[current.status]}</strong><p>${current.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}<br>Estimated ${current.estimate} min from order placement.</p><div class="steps">${statuses.map((s, i) => `<span class="step ${i <= statuses.indexOf(current.status) ? "done" : ""}"></span>`).join("")}</div></div>`
    : '<p class="quiet">Your next favourite meal starts here.</p>';
  const active = orders.filter((o) => o.status !== "completed");
  $("#activeCount").textContent = active.length;
  $("#doneCount").textContent = orders.filter(
    (o) => o.status === "completed",
  ).length;
  $("#columns").innerHTML = statuses
    .map(
      (s, i) =>
        `<div class="column"><div class="column-head"><span>${labels[s].toUpperCase()}</span><span>${orders.filter((o) => o.status === s).length}</span></div>${orders
          .filter((o) => o.status === s)
          .map(
            (o) =>
              `<article class="ticket"><div class="ticket-top"><span>#${o.number}</span><span>${new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><h4>${escapeHtml(o.customer)}</h4><p>Est. ${o.estimate} min · ${money(o.total)}</p><ul>${o.items.map((item) => `<li>${item.quantity} × ${item.name}</li>`).join("")}</ul>${i < 3 ? `<button class="ticket-action" data-next="${o.id}">${["Accept & start", "Mark ready", "Complete order"][i]} →</button>` : '<span class="eyebrow">HANDED OFF</span>'}</article>`,
          )
          .join("")}</div>`,
    )
    .join("");
  document.querySelectorAll("[data-next]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await api("/api/orders/" + b.dataset.next + "/status", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              status:
                statuses[
                  statuses.indexOf(
                    orders.find((o) => o.id === b.dataset.next).status,
                  ) + 1
                ],
            }),
          });
        } catch (e) {
          $("#kitchenError").textContent = e.message;
        }
      }),
  );
}
function setView(next) {
  document.body.classList.toggle("kitchen-mode", next === "kitchen");
  $("#menuView").classList.toggle("hidden", next === "kitchen");
  $(".hero").classList.toggle("hidden", next === "kitchen");
  $("#kitchenView").classList.toggle("hidden", next !== "kitchen");
  $("#mode").classList.toggle("hidden", next === "kitchen");
  $("#customerView").classList.toggle("hidden", next !== "kitchen");
  $("#openCart").classList.toggle("hidden", next === "kitchen");
  window.scrollTo(0, 0);
}
$("#mode").onclick = () => setView("kitchen");
$("#customerView").onclick = () => setView("customer");
init();
renderBasket();
