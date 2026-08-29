variable "name" {
  description = "Cloud Run service name (already env-prefixed by the caller, e.g. dev-gateway)."
  type        = string
}

variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GCP region to deploy the service in."
  type        = string
  default     = "asia-south1"
}

variable "image" {
  description = "Container image reference (region-docker.pkg.dev/project/travel-crm/<service>:<env>-<tag>)."
  type        = string
}

variable "service_account_email" {
  description = "Email of the service account the Cloud Run revision runs as."
  type        = string
}

variable "secrets" {
  description = "Secret Manager secrets to mount as env vars. Each entry carries the env-prefixed secret id (e.g. dev-database-url) and the exact env var name it is mounted as (computed by the caller with the uppercase-snake-case transform, incl. the booking-service EMAIL_PASS exception)."
  type = list(object({
    secret_id = string
    env_var   = string
  }))
}

variable "plain_env" {
  description = "Plain (non-secret) environment variables."
  type        = map(string)
  default     = {}
}

variable "memory" {
  description = "Memory limit, e.g. 512Mi."
  type        = string
  default     = "512Mi"
}

variable "cpu" {
  description = "CPU allocation, e.g. 1."
  type        = string
  default     = "1"
}

variable "allow_unauthenticated" {
  description = "Grant roles/run.invoker to allUsers. Only the gateway should ever set this to true."
  type        = bool
  default     = false
}

variable "min_instances" {
  description = "Minimum number of instances."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances."
  type        = number
  default     = 10
}

variable "env" {
  description = "Environment name; used only for resource labels."
  type        = string
}

variable "company_slug" {
  description = "Company identifier; used only for resource labels / cost attribution."
  type        = string
}
