# DumOS — Deployment Notes

## Current state

This assessment build is a Node.js application with a static browser UI and a small JSON file store. It has **not** been deployed. The source repository is [DumOS-Restaurant-Ordering](https://github.com/just-vishal2004/DumOS-Restaurant-Ordering). No hosted application URL or production deployment is claimed; this document describes the verified local run and a proposed deployment path.

## Verified local run

1. Install Node.js 18 or newer.
2. From the project directory, run `npm test`.
3. Run `npm start`.
4. Open `http://localhost:3000` and use the customer menu, mock checkout, and Kitchen view.

The server defaults to port `3000`; `PORT` can override it. Orders are persisted to `data/orders.json`. Keep that file on a writable disk if retaining demo orders matters. Do not use this file-backed setup with multiple application instances.

## Proposed hosting setup (not yet performed)

- Use a Node.js host that supports a long-lived HTTP process and Server-Sent Events.
- Set the start command to `npm start` and provide a Node.js 18+ runtime.
- Use a persistent volume for `data/orders.json` for a single-instance demo. For multi-instance or production use, first replace it with PostgreSQL and atomic order updates.
- Set the host's assigned port through `PORT` (the app uses the platform-provided value).
- Configure TLS and a health check at `/api/menu`; retain access logs and monitor process restarts and writable storage.
- Smoke-test checkout, invalid basket rejection, kitchen transitions, live customer tracking, server restart persistence, and SSE reconnect behavior on the chosen host.

## Release checklist

- [ ] Choose hosting provider, region, domain, and persistence model.
- [ ] Add automated build/release workflow and a reproducible lockfile if dependencies are introduced.
- [ ] Replace unauthenticated kitchen controls with staff authentication and server-side roles.
- [ ] Replace JSON-file storage before scaling beyond one instance; add migrations and backups.
- [ ] Add production error handling, request limits, logs, metrics, and alerting.
- [ ] Run API and browser integration tests in the deployment environment.
- [ ] Verify HTTPS, health checks, persistence, and live updates before sharing a URL.

No deployment, Git push, public URL, or production readiness is claimed by this submission.
