variable "project_id" {
  description = "GCP project ID for this company's Travel-CRM deployment (applied once per company fork)."
  type        = string
}

variable "region" {
  description = "GCP region for Artifact Registry (the environment deployments use the same region for Cloud Run and Secret Manager)."
  type        = string
  default     = "asia-south1"
}
