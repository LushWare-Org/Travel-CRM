# Single Cloud Run service. Ingress is always INGRESS_TRAFFIC_ALL: Cloud
# Run's "internal" ingress only admits traffic from resources attached to a
# VPC connector, which nothing in this architecture has. Backends are
# protected instead by allow_unauthenticated = false plus the gateway-only
# run.invoker IAM grant created by the parent deployment module.
resource "google_cloud_run_v2_service" "this" {
  name     = var.name
  location = var.region
  project  = var.project_id

  ingress = "INGRESS_TRAFFIC_ALL"

  labels = {
    company     = var.company_slug
    environment = var.env
  }

  template {
    service_account = var.service_account_email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.image

      resources {
        limits = {
          cpu    = var.cpu
          memory = var.memory
        }
      }

      # Secrets from Secret Manager, mounted as env vars.
      dynamic "env" {
        for_each = var.secrets
        content {
          name = env.value.env_var
          value_source {
            secret_key_ref {
              secret  = "projects/${var.project_id}/secrets/${env.value.secret_id}"
              version = "latest"
            }
          }
        }
      }

      # Plain (non-secret) env vars, e.g. NODE_ENV, *_SERVICE_URL, TRAVELPORT_*.
      dynamic "env" {
        for_each = var.plain_env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }
}

# Public ingress only for the gateway (the two SPAs call it directly).
# Backends never get this grant — they rely on the parent module's
# run.invoker grant scoped to this environment's gateway service account.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  count = var.allow_unauthenticated ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.this.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
