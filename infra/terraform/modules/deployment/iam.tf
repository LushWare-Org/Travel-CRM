# One Cloud Run service account per service. account_id is the env-prefixed
# service name ("<env>-<service>"), e.g. staging-notification-service (28
# chars, under GCP's 30-char service-account-id limit). google_service_account
# does not support labels, so company/env attribution lives in display_name.
resource "google_service_account" "services" {
  for_each = local.services

  project      = var.project_id
  account_id   = each.value.name
  display_name = "Cloud Run service account for ${each.value.name} (company: ${var.company_slug})"
}

# Scoped secretAccessor grants: each service account may read ONLY the
# env-prefixed secrets its own service consumes (local.services[<svc>].secrets).
resource "google_secret_manager_secret_iam_member" "service_secrets" {
  for_each = { for b in local.service_secret_bindings : "${b.service_key}:${b.secret_id}" => b }

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.services[each.value.service_key].email}"

  # Secrets are created in secrets.tf in this same module; keep the IAM grants
  # ordered after them (secret_id here is the short env-prefixed id).
  depends_on = [google_secret_manager_secret.secrets]
}

# run.invoker on every non-gateway backend, granted ONLY to this same
# environment's gateway service account (google_service_account.services
# ["gateway"] from THIS module instantiation — never a cross-environment
# reference, so a staging backend can never be invoked by the prod gateway's
# identity or vice versa). Combined with the gateway's Google-signed ID token
# per backend call (Services/gateway/src/index.js), this closes the gap that
# public ingress on the *.run.app URLs would otherwise open.
# (Explicit resources, mirroring the explicit module blocks in cloud_run.tf —
# see the note there on why a for_each module cannot self-reference outputs.)
resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_auth" {
  project  = var.project_id
  location = var.region
  name     = module.auth_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_user" {
  project  = var.project_id
  location = var.region
  name     = module.user_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_package" {
  project  = var.project_id
  location = var.region
  name     = module.package_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_lead" {
  project  = var.project_id
  location = var.region
  name     = module.lead_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_booking" {
  project  = var.project_id
  location = var.region
  name     = module.booking_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_billing" {
  project  = var.project_id
  location = var.region
  name     = module.billing_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_career" {
  project  = var.project_id
  location = var.region
  name     = module.career_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_flight" {
  project  = var.project_id
  location = var.region
  name     = module.flight_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_analytics" {
  project  = var.project_id
  location = var.region
  name     = module.analytics_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}

resource "google_cloud_run_v2_service_iam_member" "gateway_invoker_notification" {
  project  = var.project_id
  location = var.region
  name     = module.notification_service.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.services["gateway"].email}"
}
