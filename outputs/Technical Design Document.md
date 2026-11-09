# DumOS — Technical Design Document

## Repository

GitHub URL: **Not published.** The workspace now has a local Git history, but no GitHub remote has been created or pushed, so there is no repository URL to provide.

## Assessment choice

**Problem 4: restaurant direct ordering with a kitchen display.** DumOS is a compact single-outlet demo for Dum House, Indiranagar. It focuses on a complete order lifecycle and an explainable preparation estimate.

## What is implemented

- Responsive customer menu with five seeded dishes, basket quantities, INR totals, name validation and a mock checkout. No payment is collected.
- Node.js HTTP API for menu, estimate, order creation, order listing, and status changes.
- Orders are written through a temporary file and atomic rename to `data/orders.json`, so they survive a server restart on the same writable filesystem. Human-readable order numbers increase from the saved local order history; UUIDs identify the orders internally.
- Kitchen board groups orders by stage and receives server-sent events when orders change. Customer tracking uses the same live feed.
- The only allowed status sequence is `placed → preparing → ready → completed`.
- Estimate uses item preparation minutes, a queue adjustment and an 8-minute handoff buffer, bounded from 20 to 55 minutes. It is a transparent heuristic, not an ML prediction. If queue data is unavailable, the UI explains that it is showing a fallback.
- Three Node built-in tests cover basket validation, totals and estimate bounds, and sequential status changes.

## Run locally

Requires Node.js 18 or newer (uses built-in `fetch`, `node:test`, and modern JavaScript APIs).

```sh
npm test
npm start
```

Then open `http://localhost:3000`. Use **Kitchen view** to operate tickets. Checkout is a demo flow and does not take payment. To reset demo orders, stop the server and remove `data/orders.json`.

## Interface decisions

The menu is intentionally image-free. No genuine outlet food photography was supplied, so the interface avoids stock or generated-looking dish art. It prioritizes item descriptions, prices, preparation times, basket actions, and an actual queue view. The customer page and high-contrast kitchen board have separate visual treatments because they serve different tasks.

## Design notes

This is intentionally a small, dependency-free vertical slice. The API keeps validation and state transition rules in `lib/domain.js`; the browser renders the customer and kitchen views from API data. SSE keeps the two views synchronized without adding a message broker. Dynamic customer-provided text is HTML-escaped before rendering. JSON-file persistence keeps the demo runnable without provisioning a database.

## Verification record

- `node --test`: 3 tests passed.
- `node --check server.js` and `node --check public/app.js`: passed.
- The user-provided browser screenshots show a successful checkout, live kitchen ticket, status progression to Completed, and customer tracking. A duplicate ticket briefly appeared because the client merged the same order from both the checkout response and live update; client-side de-duplication was added afterward.

## Deliberate limits / next steps

- Single process and single outlet; JSON persistence is not safe for concurrent server instances and has no backup or migration strategy.
- No authentication or role enforcement; kitchen mode is a demo view, not an access-controlled staff account.
- No payment, tax, inventory, refunds, cancellation, kitchen station routing, or delivery integration.
- Estimate is a fixed heuristic; production use needs observed ticket timestamps, calibration, confidence ranges and explicit operational safeguards.
- Before production: move orders to PostgreSQL with atomic transitions and migrations, add authenticated customer/staff identities and authorization, rate limits and request logging, durable event delivery/reconnect strategy, deployment health checks, backups, and integration tests.
