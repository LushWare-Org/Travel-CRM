output "uri" {
  description = "HTTPS endpoint of the deployed service (used for *_SERVICE_URL wiring and gateway_url)."
  value       = google_cloud_run_v2_service.this.uri
}

output "name" {
  description = "Cloud Run service name (used by the parent module for run.invoker IAM grants)."
  value       = google_cloud_run_v2_service.this.name
}
