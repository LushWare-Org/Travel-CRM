# One Artifact Registry Docker repository shared by all three environments.
# Images are distinguished by tag (<env>-<git-sha>), not by repository, so a
# single repository is safe and never a per-environment name-collision risk.
resource "google_artifact_registry_repository" "travel_crm" {
  project       = var.project_id
  location      = var.region
  repository_id = "travel-crm"
  description   = "Docker images for all Travel-CRM Cloud Run services (dev/staging/prod share this repository; tags distinguish environments)."
  format        = "DOCKER"
}
