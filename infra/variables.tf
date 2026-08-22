variable "project_name" {
  description = "Short name used as a prefix for resource names (e.g. S3 bucket names)"
  type        = string
  default     = "article-platform"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones to spread public/private subnets across"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS control plane"
  type        = string
  default     = "1.30"
}

variable "eks_node_instance_types" {
  description = "EC2 instance types for the EKS managed node group"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "eks_desired_capacity" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 2
}

variable "eks_max_capacity" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 3
}

variable "eks_min_capacity" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 1
}

variable "app_namespace" {
  description = "Kubernetes namespace the app's pods run in (must match the actual manifests)"
  type        = string
  default     = "article-platform"
}

variable "app_service_account" {
  description = "Kubernetes ServiceAccount name the app's pods use (must match the actual manifests)"
  type        = string
  default     = "app-sa"
}
