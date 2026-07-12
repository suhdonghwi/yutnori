# Dual-service Lightsail setup plan

Status: **proposed; no production changes have been authorized**

This document describes how to serve the existing Orirang production service and Yutnori from one AWS Lightsail instance while keeping the two applications independently deployable and isolated.

The public Yutnori URL will be:

- Canonical: `https://jammy.fun/yut/`
- `https://jammy.fun/` redirects to the canonical URL.
- `https://jammy.fun/yut` redirects to the canonical URL.
- `https://www.jammy.fun/*` redirects to the equivalent canonical `https://jammy.fun/*` URL.
- Future multiplayer HTTP and WebSocket traffic uses same-origin paths under `/yut/`.

## 1. Non-negotiable constraints

1. Orirang and Yutnori remain separate applications and separate Docker Compose projects.
2. Neither application mentions, depends on, builds, restarts, or deploys the other application.
3. The shared gateway is a third infrastructure project. It owns ports 80/443, TLS, and transport-level routing only.
4. The gateway must not implement application behavior such as authentication, authorization, game rules, API response shaping, or application-specific maintenance behavior.
5. A public hostname, URL prefix, upstream name, health endpoint, and generic security/transport policy are routing contracts, not business logic; these are the only application-specific facts allowed at the gateway boundary.
6. Application containers do not publish public host ports. Only the gateway publishes ports 80 and 443.
7. **No live proxy cutover may be performed without the owner's explicit permission at the cutover checkpoint in section 11.** Preparation and read-only validation do not constitute permission.
8. Orirang maintenance mode is enabled only after cutover permission and immediately before live proxy work. It remains enabled across the proxy transition and is disabled only after both the gateway and Orirang pass post-cutover checks.
9. The deferred Orirang Caddy-volume cleanup is completed as part of the gateway transfer; it is not performed as a separate in-place normalization.

## 2. Current production state

Observed on 2026-07-11, without making changes:

- Instance: Ubuntu 24.04 on Lightsail, public/static IP `3.39.39.154`
- Public listeners: SSH 22, HTTP 80, HTTPS 443
- Existing domain: `orirang.com`
- Runtime: Docker Compose
- Proxy: Caddy 2.10, currently inside the `orirang` Compose project
- Application containers: Orirang client, Orirang server A, Orirang server B
- Database: PostgreSQL 16, published only on `127.0.0.1:5432`
- Instance memory: 1.9 GiB total, approximately 790 MiB available during inspection, no swap
- Disk: approximately 37 GiB available

Current Yutnori state:

- Vite/React static client
- Production output: `dist/`
- No server process yet
- Vite currently uses `base: "./"`

Current `jammy.fun` DNS state at Porkbun:

- Root `ALIAS` points to `pixie.porkbun.com`
- Wildcard `CNAME` points to `pixie.porkbun.com`
- These are Porkbun parking records and do not point to Lightsail.

## 3. Target architecture

```text
Internet
   |
   v
Gateway Caddy (ports 80/443)
   |                               |
   | orirang_edge                  | yutnori_edge
   v                               v
Orirang client/server          Yutnori static client
   |                               |
Orirang private DB network     Future multiplayer server
   |
PostgreSQL
```

Use two isolated edge networks rather than one common application network:

- `orirang_edge`: gateway plus the single Orirang-owned ingress
- `yutnori_edge`: gateway plus Yutnori HTTP upstreams
- Orirang's database remains on an Orirang-only backend network.

The gateway is the only container attached to both edge networks. On the Orirang side it can resolve only `orirang-ingress`, not the client, API replicas, or PostgreSQL. Consequently, a Yutnori container cannot resolve or directly connect to an Orirang container, and vice versa.

## 4. Ownership and repository boundaries

Use three independently versioned and deployed projects:

```text
/home/ubuntu/gateway
/home/ubuntu/orirang
/home/ubuntu/yutnori
```

Recommended ownership:

| Project | Owns | Must not own |
| --- | --- | --- |
| Gateway | TLS, HTTP-to-HTTPS, canonical host redirects, path dispatch, compression, generic proxy headers | UI, authentication, game logic, database behavior, API semantics |
| Orirang | Orirang client, API servers, database, migrations, application maintenance behavior | Yutnori configuration |
| Yutnori | Static client, future multiplayer server, its data/services | Orirang configuration |

Prefer a small dedicated Git repository for `gateway`. If that is not desired, it may be managed as a standalone directory, but its deployment must still be independent of both application workflows.

Source changes are made only in local repositories and delivered through pull requests:

- Yutnori: `/Users/suhdonghwi/Desktop/yutnori`
- Orirang: `/Users/suhdonghwi/Projects/orirang`
- Gateway: location to be agreed before implementation

Do not edit application source directly in `/home/ubuntu/orirang` or another production checkout. Production receives reviewed commits and immutable images through GitHub Actions. Yutnori, Orirang, and gateway changes use separate branches and pull requests.

## 5. Gateway design

### 5.1 Gateway Compose project

Each application Compose project creates and owns its named edge network. The gateway joins both as external networks and preserves Caddy state in gateway-owned named volumes:

```yaml
name: gateway

services:
  caddy:
    image: caddy:2.10-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - ./routes:/etc/caddy/routes:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - orirang_edge
      - yutnori_edge

networks:
  orirang_edge:
    external: true
    name: orirang_edge
  yutnori_edge:
    external: true
    name: yutnori_edge

volumes:
  caddy_data:
    name: gateway_caddy_data
  caddy_config:
    name: gateway_caddy_config
```

The top-level `Caddyfile` stays generic:

```caddyfile
{
    email {$ACME_EMAIL}
}

import /etc/caddy/routes/*.caddy
```

The route files are infrastructure adapters. They contain routing contracts only. They should remain short enough to audit in full.

### 5.2 Yutnori route adapter

```caddyfile
www.jammy.fun {
    redir https://jammy.fun{uri} 308
}

jammy.fun {
    encode zstd gzip

    redir / /yut/ 308
    redir /yut /yut/ 308

    # Reserve these same-origin routes for the future multiplayer server.
    # Do not enable them until yutnori-server exists and has a health check.
    # handle_path /yut/api/* {
    #     reverse_proxy yutnori-server:3000
    # }
    # handle_path /yut/socket.io/* {
    #     reverse_proxy yutnori-server:3000
    # }

    handle /yut/* {
        reverse_proxy yutnori-web:80
    }

    handle {
        respond "Not found" 404
    }
}
```

The outer gateway intentionally does **not** strip `/yut/` for the static service. The Yutnori web container is configured to serve that prefix explicitly. This makes its health checks and browser-visible paths agree and avoids ambiguous URI rewriting.

### 5.3 Orirang route adapter

Orirang retains its existing Caddy behavior in an internal, application-owned
`orirang-ingress`. That container owns maintenance mode, `/api/*` and
`/healthz` dispatch, client fallback, security headers, and API replica health
checks/load balancing. It joins the private Orirang network plus
`orirang_edge`, while the underlying client, servers, and database remain off
the edge network.

The shared gateway adapter is deliberately limited to one transport mapping:

```caddyfile
orirang.com {
    reverse_proxy orirang-ingress:80
}
```

Before cutover, verify behavior parity through `orirang-ingress`, including
maintenance on/off, API and client routing, security headers, and replica
health behavior. The gateway must not duplicate any of those rules.

## 6. Yutnori application changes

### 6.1 Vite base path

Change the Vite deployment base from `./` to `/yut/`:

```ts
export default defineConfig({
  base: "/yut/",
  // existing options
});
```

This gives generated JavaScript, CSS, icons, and other assets stable URLs under the canonical prefix.

### 6.2 Static image

Use a multi-stage image so the server contains build output only:

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm test

FROM caddy:2.10-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv/yut
```

The application-owned static Caddyfile handles only static application delivery:

```caddyfile
:80 {
    handle /yut/* {
        root * /srv
        try_files {path} /yut/index.html
        file_server
    }

    respond /healthz 200
    respond 404
}
```

This SPA fallback is harmless for the current single-page client and supports future client-side routes such as `/yut/room/abc`.

### 6.3 Yutnori Compose project

```yaml
name: yutnori

services:
  web:
    image: ghcr.io/suhdonghwi/yutnori:${IMAGE_TAG:?IMAGE_TAG is required}
    restart: unless-stopped
    expose:
      - "80"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 6
    networks:
      yutnori_edge:
        aliases:
          - yutnori-web

networks:
  yutnori_edge:
    name: yutnori_edge
```

Do not publish `80:80`, `3000:3000`, or any other application port on the host.

## 7. Future multiplayer extension

Add the server to the Yutnori project only:

```yaml
services:
  server:
    image: ghcr.io/suhdonghwi/yutnori-server:${SERVER_IMAGE_TAG:?SERVER_IMAGE_TAG is required}
    restart: unless-stopped
    expose:
      - "3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
    healthcheck:
      test:
        [
          "CMD-SHELL",
          "node -e \"fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\"",
        ]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 20s
    networks:
      yutnori_edge:
        aliases:
          - yutnori-server
```

Then enable the reserved `/yut/api/*` and `/yut/socket.io/*` gateway routes. Caddy proxies WebSocket upgrades automatically. The browser uses same-origin URLs, so ordinary multiplayer traffic requires no cross-origin setup.

The API must be written with the chosen prefix contract in mind. Because `handle_path` strips the matched prefix, the server receives `/...` rather than `/yut/api/...`. Document and test that contract when the server is introduced.

## 8. DNS migration

At Porkbun, replace the two parking records for `jammy.fun`:

| Action | Type | Host | Answer/value | TTL |
| --- | --- | --- | --- | --- |
| Delete | ALIAS | root (`jammy.fun`) | `pixie.porkbun.com` | 600 |
| Delete | CNAME | `*` | `pixie.porkbun.com` | 600 |
| Add | A | root/blank | `3.39.39.154` | 600 |
| Add | CNAME | `www` | `jammy.fun` | 600 |

Do not add a wildcard record unless a concrete wildcard-subdomain requirement appears later.

DNS can be changed before the proxy cutover only if the gateway is already able to answer `jammy.fun` safely. Otherwise visitors may reach the existing Orirang-only Caddy configuration and receive an unintended response. The DNS change and gateway activation should therefore be coordinated in the cutover window.

## 9. GitHub Actions deployment

### 9.1 Deployment model

Build immutable images in GitHub Actions, push them to GHCR, and make the instance pull by commit SHA. Do not build the application on the small production instance.

Required repository secrets or environment secrets:

- `LIGHTSAIL_HOST`: `3.39.39.154`
- `LIGHTSAIL_USER`: `ubuntu`
- `LIGHTSAIL_SSH_KEY`: dedicated deployment private key
- `LIGHTSAIL_KNOWN_HOSTS`: pinned `ssh-keyscan` output verified out of band
- `GHCR_READ_TOKEN`: only if the package cannot be pulled anonymously or with an existing instance credential

Use a protected GitHub `production` environment. Require manual approval for the initial migration and consider retaining approval for later production deployments.

### 9.2 Yutnori workflow outline

```yaml
name: Deploy production

on:
  workflow_dispatch:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  test-build-push:
    runs-on: ubuntu-latest
    outputs:
      tag: ${{ steps.meta.outputs.tag }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: meta
        run: echo "tag=${GITHUB_SHA}" >> "$GITHUB_OUTPUT"
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ghcr.io/suhdonghwi/yutnori:${{ github.sha }}

  deploy:
    needs: test-build-push
    runs-on: ubuntu-latest
    environment: production
    concurrency:
      group: yutnori-production
      cancel-in-progress: false
    steps:
      - name: Configure SSH
        run: |
          install -m 700 -d ~/.ssh
          install -m 600 /dev/null ~/.ssh/id_ed25519
          printf '%s\n' "${{ secrets.LIGHTSAIL_SSH_KEY }}" > ~/.ssh/id_ed25519
          printf '%s\n' "${{ secrets.LIGHTSAIL_KNOWN_HOSTS }}" > ~/.ssh/known_hosts
      - name: Deploy immutable image
        run: |
          ssh "${{ secrets.LIGHTSAIL_USER }}@${{ secrets.LIGHTSAIL_HOST }}" \
            "cd /home/ubuntu/yutnori && IMAGE_TAG='${{ github.sha }}' docker compose pull && IMAGE_TAG='${{ github.sha }}' docker compose up -d --wait"
      - name: Verify public route
        run: curl --fail --retry 6 --retry-all-errors https://jammy.fun/yut/
```

Pin third-party actions to reviewed commit SHAs before implementation. The version tags above are readable placeholders for the design document.

### 9.3 Deployment independence

- Yutnori workflow may run `docker compose` only in `/home/ubuntu/yutnori`.
- Orirang workflow may run `docker compose` only in `/home/ubuntu/orirang`.
- Gateway workflow may validate and reload only the gateway.
- An application workflow must not restart the gateway as part of an ordinary application release.
- A gateway route change is a separate reviewed infrastructure deployment.

## 10. Preparation and validation before cutover

The following work is safe to prepare before requesting cutover permission, provided it does not bind production ports or alter live DNS:

1. Add and test the Yutnori base-path change locally.
2. Build the static container and verify `/healthz`, `/yut/`, assets, refresh behavior, and 404 behavior.
3. Add the Yutnori Compose and GitHub Actions files.
4. Prepare the gateway repository and route adapters.
5. Create isolated Docker networks if desired; this does not affect live routing.
6. Attach application containers to their target edge networks only through a reviewed Compose update.
7. Back up `orirang_caddy_data` and `orirang_caddy_config` to a mode-restricted host directory and verify both archives. This is the deferred cleanup identified by Orirang's `docs/migrations/post-rename-cleanup-runbook.md`.
8. Let the gateway Compose project create new, correctly labeled `gateway_caddy_data` and `gateway_caddy_config` volumes. Restore the verified Orirang Caddy state into these new volumes while the candidate gateway is stopped.
9. Inspect the new volume labels, restored file ownership, and certificate/account state. The old Orirang volumes remain untouched as rollback resources.
10. Start a candidate gateway on loopback-only alternate ports, for example `127.0.0.1:8080` and `127.0.0.1:8443`, without touching ports 80/443.
11. Validate configuration:

   ```bash
   docker compose run --rm caddy caddy validate --config /etc/caddy/Caddyfile
   ```

12. Exercise host-based routing against the candidate gateway using explicit `Host` headers. Toggle maintenance through Orirang's existing command and prove the candidate gateway passes through both states without its own configuration changing.
13. Record current container IDs, images, networks, Caddy configuration, volume names, and health states for rollback.
14. Confirm that the current Orirang deployment remains healthy throughout preparation.

Pre-cutover acceptance checks:

- Orirang candidate route matches current production behavior.
- Yutnori loads from `/yut/` with no asset 404s.
- Direct `/yut` and `/` redirects are correct and do not loop.
- `www.jammy.fun` redirects to the non-`www` canonical host.
- Refreshing a future-looking path such as `/yut/room/test` returns the SPA.
- Yutnori cannot resolve Orirang container aliases, and Orirang cannot resolve Yutnori aliases.
- No Yutnori application port is published on the host.
- Caddy data has a verified preservation/rollback strategy.
- Gateway volumes were created by the gateway Compose project and contain the verified restored Caddy state.
- Orirang ingress maintenance returns HTTP 503 with the intended `Retry-After` header through the unchanged candidate gateway, while disabling it restores normal routing.
- GitHub Actions uses pinned host keys rather than disabling host verification.

## 11. Mandatory production cutover checkpoint

> **STOP HERE. Do not stop, replace, reload, or reconfigure the production proxy; bind another process to ports 80/443; or change `jammy.fun` DNS until the owner gives explicit permission for the production cutover.**

The approval request must include:

- exact proposed commands;
- expected interruption, if any;
- current health status of Orirang;
- candidate gateway validation results;
- DNS changes to be made;
- rollback commands;
- confirmation that existing Caddy data is backed up or reused safely.
- the exact maintenance-mode enable, verification, and disable commands.

Permission to write or approve this document is not permission to perform the cutover. Permission to prepare containers or workflows is also not permission to perform the cutover.

## 12. Cutover procedure after explicit approval

Only after approval:

1. Reconfirm Orirang health and capture the current production state.
2. Ensure the candidate gateway configuration validates and the rollback command has been reviewed.
3. Enable maintenance through Orirang's existing command. The shared maintenance file is read by both the legacy proxy and the internal ingress, and the command reloads both running Orirang Caddy services.
4. Verify externally that the legacy proxy returns HTTP 503 with the intended `Retry-After` header, and verify `orirang-ingress` returns the same response internally. Record the start of the maintenance window.
5. Stop only the existing Orirang-owned public proxy container, leaving Orirang ingress, client, servers, and PostgreSQL running.
6. Start the standalone gateway on ports 80/443 using the restored, gateway-owned Caddy volumes.
7. Verify that public Orirang still returns the Orirang-owned maintenance response through `orirang-ingress` and the new gateway.
8. Verify the gateway cannot resolve or reach the Orirang client, servers, or database directly.
9. Test the Orirang client, API health, representative read behavior, upstream health, TLS, headers, and routing through the internal ingress while public maintenance remains enabled.
10. If Orirang verification fails, execute rollback while keeping maintenance enabled and before touching DNS.
11. Start or verify the Yutnori web container.
12. Replace the Porkbun parking records with the records in section 8.
13. Poll authoritative and public DNS until `jammy.fun` resolves to `3.39.39.154`.
14. Verify all Yutnori redirect and content cases while Orirang remains in maintenance:

    ```text
    http://jammy.fun/          -> https://jammy.fun/yut/
    https://jammy.fun/         -> https://jammy.fun/yut/
    https://jammy.fun/yut      -> https://jammy.fun/yut/
    https://jammy.fun/yut/     -> 200 game HTML
    https://www.jammy.fun/     -> https://jammy.fun/yut/
    ```

15. Check certificate issuance and Caddy logs.
16. Disable maintenance through Orirang's existing command only after the new gateway and internal Orirang checks have passed. This reloads `orirang-ingress`; it does not change or reload the shared gateway.
17. Verify normal public Orirang behavior, `/healthz`, a representative read, and a representative write after maintenance is disabled. Record the end of the maintenance window.
18. Observe both services, container health, memory, and error logs for at least 15 minutes.
19. Mark the migration complete only after both applications remain healthy.

This single maintenance window also completes the intent of Orirang's deferred Caddy-volume ownership cleanup. Do not recreate the old volumes merely to add Orirang Compose labels: the proxy has moved, so the correctly owned replacement volumes belong to the gateway. Retain the old volumes until the gateway rollback window closes, then remove them only through a separate explicitly approved cleanup.

## 13. Rollback

### 13.1 Gateway/Orirang rollback

If the standalone gateway fails or changes Orirang behavior:

1. Keep Orirang maintenance mode enabled; do not expose an unverified application state.
2. Stop the standalone gateway so it releases ports 80/443.
3. Restore/start the original Orirang proxy using the previously recorded image, Compose file, configuration, networks, and untouched Orirang Caddy volumes.
4. Verify that the original proxy serves the maintenance response.
5. Verify Orirang internally through the restored routing path.
6. Disable maintenance only after rollback health is confirmed.
7. Verify normal public `orirang.com` and its API.
8. Leave Yutnori disabled until the gateway issue is corrected.

Do not roll back the Orirang database or application containers for a gateway-only failure.

### 13.2 DNS rollback

If Yutnori cannot be served after DNS activation:

- Preferred: leave the `A` record in place and make the gateway return a controlled temporary response while the routing issue is fixed, provided Orirang remains safe.
- Full rollback: restore Porkbun's parking records only if intentionally returning the domain to parking is desired.

DNS rollback is not instantaneous because resolvers may cache the previous answer for the TTL.

### 13.3 Yutnori release rollback

Retain the previously deployed image SHA. Roll back only Yutnori:

```bash
cd /home/ubuntu/yutnori
IMAGE_TAG=<previous-good-sha> docker compose pull
IMAGE_TAG=<previous-good-sha> docker compose up -d --wait
```

This must not restart Orirang or the gateway.

## 14. Operational follow-up

After migration:

- Add uptime checks for `orirang.com`, `jammy.fun/yut/`, and both health endpoints.
- Add Docker log rotation so containers cannot consume the disk indefinitely.
- Monitor instance memory before adding multiplayer. There was no swap during inspection.
- Prune unused Docker images/build cache using a scheduled, conservative policy; do not remove active images or rollback candidates.
- Back up the gateway repository/configuration and Caddy volumes.
- Keep at least one previous known-good Yutnori image available.
- Document who may approve production gateway changes.
- Review whether the 1.9 GiB instance remains sufficient when the multiplayer process and any game database are added.

## 15. Definition of done

The migration is complete when:

- `orirang.com` retains its existing production behavior.
- Orirang maintenance mode spans the live proxy transition and is disabled only after post-cutover health checks pass.
- Orirang, not the shared gateway, owns maintenance mode, API routing, headers, load balancing, and client fallback.
- `jammy.fun` and `www.jammy.fun` canonicalize to `https://jammy.fun/yut/`.
- Yutnori assets and SPA refreshes work under `/yut/`.
- TLS is valid for both domains.
- Gateway, Orirang, and Yutnori are independent Compose projects.
- Each application has an isolated Docker network and cannot resolve the other application.
- Each application can deploy without restarting the other or the gateway.
- Yutnori deploys through GitHub Actions using immutable image tags.
- No application container publishes a public host port.
- Rollback has been tested or rehearsed without affecting production traffic.
- The old Orirang Caddy volumes are retained as rollback resources, while active Caddy state resides in correctly labeled gateway-owned volumes.
- The future `/yut/api/*` and `/yut/socket.io/*` route contracts are documented but remain disabled until a healthy multiplayer server exists.
