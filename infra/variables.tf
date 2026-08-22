variable "project_name" {
  description = "Short name used as a prefix for resource names (e.g. S3 bucket names)"
  type        = string
  default     = "cloud-native-article-platform"
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
