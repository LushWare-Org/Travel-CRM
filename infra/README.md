# Travel-CRM Infrastructure

Terraform-managed GCP infrastructure for Travel-CRM's microservices backend. This document describes **only what is currently deployed and verified working** — see "Not deployed" below for everything that's configured in code but not live yet.

## Live right now

**Environment:** `dev` only. `staging`/`prod` directories exist under `infra/terraform/deployments/` but have never been applied — no resources exist for them.

**GCP project:** `travelcrm-506818` (region `asia-south1`)

**Backend API:** all 11 microservices are deployed to Cloud Run and healthy.

| Service | URL |
|---|---|
| **Gateway (public entry point)** | **https://dev-gateway-fbystisnzq-el.a.run.app** |
| auth-service | https://dev-auth-service-fbystisnzq-el.a.run.app |
| user-service | https://dev-user-service-fbystisnzq-el.a.run.app |
| package-service | https://dev-package-service-fbystisnzq-el.a.run.app |
| lead-service | https://dev-lead-service-fbystisnzq-el.a.run.app |
| booking-service | https://dev-booking-service-fbystisnzq-el.a.run.app |
| billing-service | https://dev-billing-service-fbystisnzq-el.a.run.app |
| career-service | https://dev-career-service-fbystisnzq-el.a.run.app |
| flight-service | https://dev-flight-service-fbystisnzq-el.a.run.app |
| analytics-service | https://dev-analytics-service-fbystisnzq-el.a.run.app |
| notification-service | https://dev-notification-service-fbystisnzq-el.a.run.app |

Only the gateway is publicly invocable (`allUsers` on `run.invoker`). Every other service accepts requests only from the `dev-gateway` service account's identity token — calling any backend URL directly returns `403`, by design.

Verified: `GET /health` on the gateway returns `200 {"status":"ok","service":"api-gateway"}`.

**Image tag currently deployed:** `dev-b6cb79d` (built from `Services/` at commit `b6cb79d`), pushed to the shared Artifact Registry repo.

## Not deployed

- **Frontend (Client, Management).** No live site exists for either app. `firebase.json` at the repo root defines hosting targets (`client-dev`, `management-dev`, etc.) but:
  - `.firebaserc` (which maps those targets to real Firebase Hosting site IDs) does not exist.
  - The `firebasehosting.googleapis.com` API is disabled on `travelcrm-506818` — Firebase Hosting has never been initialized for this project.
  - The Firebase CLI isn't installed in this environment.
  - `Client/dist` and `Management/dist` build output exists locally but has never been pushed anywhere.

  The backend's `CLIENT_URL`/`MANAGEMENT_URL` env vars (`https://client-dev.web.app`, `https://management-dev.web.app`) are placeholders for domains that don't exist yet — CORS/redirects referencing them will fail until Firebase Hosting is set up and deployed.

- **`staging` and `prod` environments.** Config is written and mirrors `dev` exactly, but no `terraform apply` has ever run against either. `terraform.tfvars` doesn't exist for them (only `.tfvars.example` templates).

- **CI/CD.** Everything above was built, pushed, and applied manually from a local shell. There is no pipeline that rebuilds images or re-applies Terraform on merge.

## Known placeholder / inactive config in `dev`

These are deliberate, not bugs — real values can be dropped in later without any Terraform structure changes:

- **Travelport** (`travelport_client_id`, `_client_secret`, `_token_url`, `_api_base_url`, `_access_group`): all `"unset"`. `flight-service` never uses them — `TRAVELPORT_MOCK_MODE=true` and a real `DUFFEL_ACCESS_TOKEN` mean the client factory always picks `DuffelClient`/`MockFlightClient` first (`Services/flight-service/src/clients/index.js`).
- **Facebook** (`facebook_app_secret`, `facebook_page_access_token`): both `"unset"`. Only read when an actual Meta webhook call arrives (`Services/notification-service/src/controllers/webhook.controller.js`) — nothing calls this in `dev`.
- **Branding/invoice/bank/admin-email config** (35 variables — company name, bank details, WhatsApp templates, etc.): all empty strings. Every consumer reads them as `process.env.X || <generic default>`, so this is behavior-identical to unset.
- **WhatsApp, email, Duffel, Cloudinary, Gemini, LiteAPI**: real values, live and working.

## Repo layout

```
infra/terraform/
├── deployments/
│   ├── shared/       # One Artifact Registry repo, shared by all 3 envs. Applied.
│   ├── dev/           # Applied — this is what's live.
│   ├── staging/       # Not applied.
│   └── prod/          # Not applied.
└── modules/
    └── deployment/    # Reusable module: 11 Cloud Run services, Secret Manager,
                        # per-service service accounts + scoped IAM, invoked once
                        # per environment directory above.
        └── modules/cloud-run-service/  # Single-service Cloud Run + IAM sub-module.
```

`local.services` in `modules/deployment/locals.tf` is the single source of truth for every service's secrets, plain env vars, and Cloud Run sizing.

## State

Terraform state is remote: GCS bucket `lush-ware-travel-crm-tfstate` (region `ASIA-SOUTHEAST1`, versioning **on**), one prefix per environment (`travel-crm/shared`, `travel-crm/dev`, `travel-crm/staging`, `travel-crm/prod`). Nothing is stored locally or in git.

## Operating `dev`

### Prerequisites (already satisfied for this project/bucket, listed for a new operator)

- `gcloud auth application-default login` — Terraform authenticates via ADC, not `gcloud auth login` alone.
- The authenticating principal needs, at minimum: `Editor`, `Cloud Run Admin`, `Secret Manager Admin`, `Service Account User` on `travelcrm-506818`. (Editor already covers resource creation; the other three cover setting IAM policy on Cloud Run services/secrets and attaching service accounts to Cloud Run — gaps Editor deliberately excludes.)
- APIs already enabled: `run`, `secretmanager`, `artifactregistry`, `iam`, `cloudresourcemanager`.
- Docker configured for the registry: `gcloud auth configure-docker asia-south1-docker.pkg.dev`.

### Rebuild and redeploy a service after a code change

```bash
cd Services
REPO=asia-south1-docker.pkg.dev/travelcrm-506818/travel-crm
SHA=$(git rev-parse --short HEAD)

docker build -f <service>/Dockerfile -t "$REPO/<service>:dev-$SHA" .
docker push "$REPO/<service>:dev-$SHA"
```

Then update `image_tag` in `infra/terraform/deployments/dev/terraform.tfvars` to `$SHA` and:

```bash
cd infra/terraform/deployments/dev
terraform plan -out=tf.plan
terraform apply tf.plan
```

Build context is `Services/` (not the individual service folder) — every Dockerfile `COPY`s from `shared/*` before the service directory.

### Inspect current state / drift

```bash
cd infra/terraform/deployments/dev
terraform plan   # should report "No changes" when nothing has changed out-of-band
```

### View logs for a service

```bash
gcloud run services logs read dev-<service> --project=travelcrm-506818 --region=asia-south1 --limit=50
```

## Notes for whoever touches this next

- **Docker build context is the whole `Services/` directory**, not the per-service folder — every Dockerfile assumes `shared/constants`, `shared/pricing-engine`, `shared/contracts`, `shared/lead-pricing-engine` are copied in ahead of the service's own code.
- **`package-lock.json` correctness matters at build time, not just at `npm install` time in dev.** A stale/incomplete lockfile (missing transitive packages that the declared `package.json` deps actually pull in) can pass local development undetected if `node_modules` was never rebuilt from a clean `npm ci`, then fail during the Docker image build. If a service's image build fails with `npm error Invalid Version` or similar, regenerate its lockfile: `rm package-lock.json && npm install --package-lock-only`.
- **A service can run locally via `npm run dev` while missing a `package.json` dependency**, if that package happens to already be installed at a workspace-hoisted `node_modules` level or was manually `npm install`ed once without updating `package.json`. `npm ci` in the Docker build does not see that — it only installs what's declared. If a fresh image fails at startup with `ERR_MODULE_NOT_FOUND`, the fix is adding the missing package to that service's own `package.json` (check what version sibling services use for the same package, for consistency), not touching the Dockerfile.
- **Cloud Run resources have `deletion_protection = true` by default** (the provider's default, not something this repo overrides). A `terraform apply -replace=<cloud_run_resource>` will fail on the destroy step. To force a service to pick up a new image push under the *same* tag, use `gcloud run services update <service> --image=<repo>/<service>:<tag>` directly instead — Terraform's own state for the resource is unaffected since the `image` string in config didn't change, so a subsequent `terraform plan` will show no drift. If a resource ends up `tainted` in state from a failed replace attempt, clear it with `terraform untaint <address>` once the underlying service is healthy again — otherwise the next `apply` will try (and fail) to destroy it.
- **The `notification_lead_service_url` / `lead_billing_service_url` cycle-breaker variables** are real deployed values now (not placeholders) — `lead-service` and `notification-service` call each other, and `lead-service` calls `billing-service`, so these were bootstrapped in a second `apply` after the first one produced real Cloud Run URLs. If either service is ever destroyed and recreated with a new URL, these two `terraform.tfvars` entries need to be updated and re-applied.
