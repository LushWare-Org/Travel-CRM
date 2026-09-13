# Getting a Paid-Tier Gemini API Key (AI Studio) for Travel-CRM

Operational runbook for moving this project's Gemini usage off the Free tier.

**Audience:** whoever administers the `travelcrm-506818` Google Cloud project and its billing.
**Scope:** the Gemini API key consumed by `package-service` and `assistant-service`
(`GEMINI_API_KEY` → Secret Manager `<env>-gemini-api-key`).

---

## TL;DR

1. Enable `generativelanguage.googleapis.com` on `travelcrm-506818`.
2. Create an API key in that project, restricted to the Generative Language API.
3. In AI Studio, **set up billing and prepay at least $5** — this is what lifts you to
   **Tier 1**. The GCP Free Trial's $300 credit **cannot** be used for this.
4. Put the key into `infra/terraform/deployments/dev/terraform.tfvars` and `terraform apply`.
5. Roll the two consuming Cloud Run services so they pick up the new secret version.

---

## 1. Why paid — is it better?

Yes, for anything beyond local development. The differences are quota **and** data policy,
not just speed.

| | Free tier | Paid tier (Tier 1) |
|---|---|---|
| Qualification | Active project **or free trial** | Linked billing account + Prepay balance ≥ $5 |
| Rate limits | Low RPM / RPD (project-wide) | Far higher RPM / TPM / RPD; spend cap $250 per 10 min |
| Prompts & responses | **May be used to improve Google products** | **Not** used to improve Google products |
| Quota increases | Not allowed during Free Trial | Requestable |
| Advanced models | Limited set | Full set |
| Cost | $0 | Per token, deducted from a Prepay balance |
| Failure mode | Throttling (`429`) | `429` if Prepay balance reaches $0 — **then all keys on the billing account stop at once** |

**The decisive factor for this app is data use.** We send real lead data (destinations,
traveler preferences, assistant turns) into prompts. Free tier permits Google to use that to
improve products; paid tier does not. For a CRM holding customer data, that is a compliance
question, not a performance tweak.

**Where "better" does not apply:** local development against synthetic data. Keep dev on a
free key so it never spends real money (§9).

> **Critical:** the GCP Free Trial **$300 Welcome credit does not pay for Gemini API usage**.
> Google documents this explicitly. The welcome credit still covers Cloud Run, Firebase,
> Artifact Registry, Secret Manager, etc. — just not Gemini tokens. Gemini billing is a
> **separate Prepay ledger** from your Cloud Billing account.

---

## 2. Prerequisites

- `gcloud` authenticated as an account with **Owner** (or Editor + `serviceusage.services.enable`
  and `apikeys.*`) on `travelcrm-506818`.
- A Cloud Billing account **you administer** (or permission to create one). See §10 if the
  project's current billing account is not one you can access.
- A payment method on that billing account (a card was already registered at Free Trial signup).

Check current state:

```bash
gcloud config get-value project        # expect travelcrm-506818
gcloud billing projects describe travelcrm-506818 \
  --format='value(billingEnabled,billingAccountName)'
gcloud billing accounts list --format='table(name,displayName,open)'
```

If the account named in `billingAccountName` is **not** in the `list` output, you cannot
administer it — jump to §10 before continuing.

---

## 3. Step A — Enable the APIs on the project

```bash
gcloud services enable generativelanguage.googleapis.com apikeys.googleapis.com \
  --project travelcrm-506818
```

- `generativelanguage.googleapis.com` — the Gemini API itself.
- `apikeys.googleapis.com` — only needed for the `gcloud services api-keys` path below; the
  AI Studio UI enables it implicitly.

Confirm:

```bash
gcloud services list --enabled --project travelcrm-506818 \
  --filter='config.name:generativelanguage.googleapis.com' \
  --format='value(config.name)'      # must print the API name
```

---

## 4. Step B — Create the API key in `travelcrm-506818`

> **The single most common mistake:** AI Studio creates the key in a **new, auto-generated
> project by default**, which has no billing → Free tier forever. Always explicitly select the
> existing project.

Each environment should own its own key.

### Option 1 — AI Studio UI

1. Open <https://aistudio.google.com/apikey>.
2. **Create API key**.
3. In the project dropdown, **select `travelcrm-506818`** (do not accept the default
   "new project").
4. Copy the key — you will not see it again.

### Option 2 — `gcloud` (reproducible, restriction applied at creation)

Use `--key-id` so the key's identifier is known and deterministic. Without it, `create`
returns an *operation*, not the key, so there is nothing reliable to scrape a UID from:

```bash
gcloud services api-keys create \
  --project=travelcrm-506818 \
  --key-id=gemini-paid \
  --display-name="gemini-paid" \
  --api-target=service=generativelanguage.googleapis.com

# Retrieve the secret string on demand — never paste it into chat or a commit.
gcloud services api-keys get-key-string gemini-paid \
  --project=travelcrm-506818 --format='value(keyString)'
```

`--api-target=service=generativelanguage.googleapis.com` restricts the key to only the Gemini
API, so a leak cannot be used against other enabled APIs. (If you skipped `--key-id`, find the
identifier with `gcloud services api-keys list --project travelcrm-506818 --format='value(uid)'`.)

**Do not** add an IP/referrer restriction: Cloud Run egress here is not static (no VPC
connector / Cloud NAT in the Terraform), so an IP allowlist would break the deployment.

---

## 5. Step C — Upgrade to the Paid Tier (AI Studio Prepay)

Billing — not key creation — is what sets the tier. Tiers are determined at the **billing
account** level.

1. Open <https://aistudio.google.com/projects>.
2. Find the project (`travelcrm-506818`) and look at the **Billing Tier** column.
3. Click the action it shows:
   - **"Set up billing"** — no billing account attached yet.
   - **"Set up Prepay"** — billing account attached but Prepay must be configured.
   - **"No credits"** — Prepay configured, balance depleted.
4. Choose/confirm the billing account and **prepay a minimum of $5** (max $5,000).
5. Optionally enable **Auto-reload** and set a **Monthly auto-charge limit** to bound spend.

Notes:

- New accounts default to the **Prepay** plan (credits bought up front, deducted in near
  real-time). Prepay credits apply **only** to Gemini API usage — not to other GCP services.
- Unused Prepay credits **expire after 12 months** and are **non-refundable** (except when
  migrating Prepay → Postpay).
- Prepay credits and the GCP Free Trial credit are entirely separate purses. You cannot
  convert one into the other.
- Attaching Prepay to an existing Cloud Billing account **modifies that account**; cancel
  midway and you may briefly disrupt services already linked to it. Complete the purchase in
  one sitting.

---

## 6. Step D — Verify you are actually on the Paid Tier

Run **all** of these; a green check in one does not imply the others.

```bash
# 1. Billing is on the project
gcloud billing projects describe travelcrm-506818 --format='value(billingEnabled)'

# 2. The key exists and is API-restricted
gcloud services api-keys list --project travelcrm-506818 \
  --format='table(displayName,uid,restrictions.apiTargets.serviceName.list())'
```

3. **AI Studio → Projects** — the project's *Billing Tier* must read **Tier 1** (or higher),
   not "Free".
4. **AI Studio → Billing** — Prepay balance must be **> $0**.
5. **Functional check** — send one request with the new key and confirm a `200`:

```bash
KEY="$(gcloud services api-keys get-key-string gemini-paid \
  --project=travelcrm-506818 --format='value(keyString)')"
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent" \
  -H "x-goog-api-key: $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"ping"}]}]}'
```

`200` = working. `429` = still throttled (tier not applied, or balance is $0). `403` = the key
is restricted to an API it wasn't allowed to call, or the API isn't enabled.

> Tier 1 activation is usually instant after the prepay clears. Tier 2 requires $100 paid + 3
> days; Tier 3 requires $1,000 paid + 30 days.

---

## 7. Step E — Deploy the new key into this repo

The key reaches the services through Terraform-managed Secret Manager, **not** through
checked-in env files.

Wiring (for reference):
`infra/terraform/modules/deployment/secrets.tf` creates `<env>-gemini-api-key` from
`var.gemini_api_key`; `locals.tf` binds it to **`package-service`** and **`assistant-service`**
as the env var `GEMINI_API_KEY`; `modules/cloud-run-service/main.tf` mounts it with
`version = "latest"`.

### 7.1 Edit the gitignored tfvars

`*.tfvars` is gitignored (`.gitignore:152`), so this never lands in a commit.

```hcl
# infra/terraform/deployments/dev/terraform.tfvars
gemini_api_key = "<the new key>"
```

### 7.2 Apply

```bash
cd infra/terraform/deployments/dev
terraform plan -out=tf.plan     # read it: exactly one new secret version, nothing else
terraform apply tf.plan
rm tf.plan                      # plan files embed resource attributes — never keep one
```

This creates a new version of the `dev-gemini-api-key` secret.

### 7.3 Roll the consumers (required)

Because Cloud Run pins the secret to `version = "latest"`, and Terraform ignores the container
image, **`terraform apply` alone does not roll a revision** — warm instances keep the old key.
Force a new revision with a harmless label change:

```bash
for s in dev-package-service dev-assistant-service; do
  gcloud run services update "$s" --region=asia-south1 \
    --update-labels=key-rotated=$(date +%s)
done
```

### 7.4 Confirm the services are healthy

```bash
curl -s https://dev-gateway-fbystisnzq-el.a.run.app/health
# then exercise an AI endpoint (e.g. GET /packages/ai-status → { configured: true })
```

### 7.5 Production

`infra/terraform/deployments/prod/terraform.tfvars` is not present in this checkout; create it
from `terraform.tfvars.example` when prod is provisioned, and repeat §7.1–7.4 with the prod
env. Use a **separate key** per environment so a dev key leak never affects prod.

---

## 8. Step F — Cost guardrails

- **Project spend cap:** AI Studio → **Spend** page → *Monthly spend cap* → Edit. Caps overages
  at the project level within the billing account's overall limit.
- **Auto-reload monthly limit:** AI Studio → Billing → *Manage auto-reload* → *Monthly Limit*.
  Note: one-off manual payments do not count against it.
- **Cloud Billing budget alert:** informs but does not stop spend.

```bash
gcloud billing budgets create \
  --billing-account=<BILLING_ACCOUNT_ID> \
  --display-name="Gemini API cap" --budget-amount=25USD \
  --filter-projects=projects/travelcrm-506818
```

At current traffic the model is pinned to `gemini-3.5-flash` (`GEMINI_MODEL` overrides it), and
Flash-tier token pricing is low — $5 of Prepay covers a large number of generations.

---

## 9. Local development

Keep local dev **off** the billed key. Use a free-tier key with synthetic data in:

- `Services/package-service/.env` → `GEMINI_API_KEY=...`
- `Services/assistant-service/.env` → `GEMINI_API_KEY=...`

Keeping dev on the free key means experiments never spend money, and the paid key's quota is
reserved for the deployed app.

---

## 10. Troubleshooting

**"The caller does not have permission to access billingAccounts/…"**
The project is linked to a billing account your login cannot administer (common when the
project sits under a different account/org). Either:
1. have that account's billing admin perform §5, or
2. link `travelcrm-506818` to a billing account you administer:

```bash
gcloud billing projects link travelcrm-506818 --billing-account=<YOUR_ACCOUNT_ID>
```

**AI Studio shows "Free tier" after you paid.**
Tiers attach to the **billing account**, not the key. Confirm the project is linked to the
account holding the Prepay balance (AI Studio → Projects → *Billing Tier* column).

**`429` persists on a paid project.**
Check the AI Studio *Rate limits* page for your active limits, and confirm balance > $0. If
you legitimately exceed Tier 1, use the paid-tier rate-limit-increase form (linked from the
rate-limits doc).

**Free Trial ended / billing account closed.**
Projects and resources stop; there is a 30-day grace period to upgrade and recover. Any
Gemini Prepay balance is separate and unaffected by the Cloud Billing account's state.

**All keys stopped at once.**
Prepay balance hit $0 — this is by design. Buy credits to restore.

---

## 11. References

- Gemini API — Billing: <https://ai.google.dev/gemini-api/docs/billing>
- Gemini API — Rate limits & tiers: <https://ai.google.dev/gemini-api/docs/rate-limits>
- Google Cloud Free Program (incl. Free Trial restrictions): <https://docs.cloud.google.com/free/docs/free-cloud-features>
- AI Studio API keys: <https://aistudio.google.com/apikey>
- AI Studio projects / tier: <https://aistudio.google.com/projects>

---

## Appendix — Verification checklist

- [ ] `generativelanguage.googleapis.com` enabled on `travelcrm-506818`
- [ ] Key created **in `travelcrm-506818`**, restricted to the Generative Language API, id `gemini-paid`
- [ ] Billing account linked that you administer
- [ ] Prepay balance **≥ $5** and **> $0**
- [ ] AI Studio *Projects* shows **Tier 1** for the project
- [ ] `terraform apply` added exactly one new `dev-gemini-api-key` version
- [ ] `dev-package-service` and `dev-assistant-service` rolled to a new revision
- [ ] `/packages/ai-status` reports `configured: true`
- [ ] Spend cap and/or auto-reload limit configured
- [ ] Local `.env` files still use a free key
