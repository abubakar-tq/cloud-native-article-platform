# Article Management System

A Node.js/Express web application for creating, publishing, and moderating articles, built on Sequelize and PostgreSQL. It includes user authentication with email verification, an admin panel, a complaints workflow, and file uploads for article media.

This repo doubles as a DevOps portfolio project: the application code is intentionally simple, and the interesting part is everything around it — Docker, Terraform, Kubernetes, and two separate CI/CD systems (GitHub Actions and Jenkins), all provisioning and deploying against [LocalStack](https://www.localstack.cloud/) instead of real AWS, so the whole pipeline is free to run and reset as often as needed.

## Features

- **Authentication**: signup with email OTP verification, login, logout, forgot/reset password, session-based auth
- **Articles**: create, read, update, delete; public/private visibility; image and document attachments
- **Admin panel**: manage users (block/unblock), manage articles (toggle visibility), review and resolve complaints
- **Complaints**: authenticated users can file complaints, which admins triage
- **Health check**: `/health` endpoint for basic liveness reporting

## Tech Stack

- **Runtime**: Node.js, Express
- **Database**: PostgreSQL via Sequelize ORM
- **Views**: EJS templates
- **Auth/session**: `express-session` (PostgreSQL-backed session store in production via `connect-pg-simple`)
- **File storage**: AWS S3 (`multer-s3`) for article images/documents
- **Email**: Resend API, with a console-logged mock fallback in development

## Getting Started (application only)

### Prerequisites

- Node.js 18+
- PostgreSQL 15
- An AWS S3 bucket (for article media uploads) — or LocalStack, see below

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create the database**
   ```bash
   createdb devops_db
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Fill in the values described in [Environment Variables](#environment-variables) below.

4. **Run migrations and seeders**
   ```bash
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```

5. **Start the app**
   ```bash
   npm run dev    # with hot reload
   # or
   npm start      # production mode
   ```

6. **Open the app**
   - Application: http://localhost:3000
   - Health check: http://localhost:3000/health

## Environment Variables

| Variable | Purpose |
|---|---|
| `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`, `DB_HOST`, `DB_PORT` | PostgreSQL connection |
| `DB_SSL` | Set to `false` to disable SSL for local Postgres |
| `NODE_ENV` | `development` or `production` |
| `PORT` | Port the app listens on |
| `SESSION_SECRET` | Secret used to sign session cookies |
| `COOKIE_SECURE` | Set to `true` to require HTTPS for session cookies |
| `RESEND_API_KEY` | API key for sending email via Resend (falls back to a console mock if unset) |
| `EMAIL_FROM` | From-address used on outgoing email |
| `AWS_REGION` | Region for the S3 client used by uploads |
| `S3_UPLOADS_BUCKET` | S3 bucket that stores uploaded article images/documents |
| `AWS_ENDPOINT_URL` | Set to LocalStack's endpoint (e.g. `http://localstack:4566`) to route S3 calls there instead of real AWS; leave unset for real AWS |
| `LOCALSTACK_AUTH_TOKEN` | LocalStack Pro auth token — only read by the `localstack` service itself, not the app |

AWS credentials for S3 access are picked up via the standard AWS SDK credential chain (environment variables, shared config file, or an attached role), not a dedicated app setting.

## API Endpoints

### Auth (`/auth`)
- `GET /auth/signup`, `POST /auth/signup`
- `POST /auth/resend` — resend OTP
- `GET /auth/verify`, `POST /auth/verify`
- `GET /auth/login`, `POST /auth/login`
- `GET /auth/logout`, `POST /auth/logout`
- `GET /auth/forgot-password`, `POST /auth/forgot-password`
- `GET /auth/reset-password`, `POST /auth/reset-password`
- `GET /auth/admin/login`, `POST /auth/admin/login`

### Articles (`/articles`, requires auth)
- `GET /articles` — list articles
- `GET /articles/mine` — list the current user's articles
- `GET /articles/create` — creation form
- `POST /articles` — create article
- `GET /articles/:id` — view article
- `GET /articles/update/:id` — edit form
- `PUT /articles/:id` — update article
- `DELETE /articles/:id` — delete article

### Complaints (`/complaints`, requires auth)
- `GET /complaints/new` — complaint form
- `POST /complaints` — submit complaint

### Admin (`/admin`, requires admin)
- `GET /admin` — dashboard
- `GET /admin/users`, `POST /admin/users/:id/toggle-block`
- `GET /admin/articles`, `POST /admin/articles/:id/toggle-visibility`
- `GET /admin/complaints`, `POST /admin/complaints/:id/resolve`

### System
- `GET /health` — health check

## Testing

```bash
npm test        # runs test/basic.test.js
npm run lint     # ESLint
```

---

# DevOps & Infrastructure

## Architecture overview

```
GitHub push
   │
   ├──► GitHub Actions (.github/workflows/ci-cd.yml)
   │      lint/security-scan → test → build & push image to GHCR
   │      → terraform validate/fmt → validate k8s manifests
   │
   └──► Jenkins (self-hosted, jenkins/)
          Start LocalStack → wait for health
          → terraform apply (infra/, against LocalStack)
          → extract kubeconfig from the emulated EKS cluster
          → kubectl apply (k8s/) — deploys the image GitHub Actions published
```

The pipeline is deliberately split across two CI systems:

- **GitHub Actions** handles everything that doesn't need real infrastructure — linting, tests, building/publishing the Docker image to GHCR, and static validation of the Terraform and Kubernetes configs (`terraform fmt`/`validate`, `kubeconform`). GitHub's hosted runners have no way to reach a LocalStack instance running on a personal machine.
- **Jenkins runs self-hosted** (in Docker, alongside LocalStack) specifically so it *can* reach LocalStack, and is the one that actually runs `terraform apply` and `kubectl apply` against it.

## Local infrastructure stack

`docker-compose.yml` (repo root) runs the application stack itself:

| Service | Purpose |
|---|---|
| `db` | PostgreSQL for the app |
| `app` | The Node.js app, built from the repo's `Dockerfile` |
| `localstack` | Emulates the AWS services the project uses: S3, IAM, STS, EC2, and EKS (Pro tier). Has the Docker socket bind-mounted so it can spin up a real [k3d](https://k3d.io/) cluster to emulate EKS. |

`jenkins/docker-compose.yml` runs Jenkins itself, built from a custom image (`jenkins/Dockerfile`) with Terraform, `kubectl`, and the Docker CLI/Compose plugin installed, and the Docker socket bind-mounted so its pipeline can control LocalStack and reach into other containers directly.

## Infrastructure as Code — `infra/` (Terraform, against LocalStack)

| File | Provisions |
|---|---|
| `provider.tf` | AWS provider configured to talk to LocalStack instead of real AWS (dummy credentials, path-style S3, per-service endpoint overrides) |
| `vpc.tf` | A VPC spanning two availability zones with public/private subnets |
| `iam_roles.tf` | IAM roles for the EKS cluster and node group |
| `eks.tf` | The EKS cluster and managed node group, an OIDC identity provider registered against the cluster's own issuer, and an IRSA (IAM Roles for Service Accounts) role granting the app's pods S3 access |
| `s3.tf` | The S3 bucket used for article uploads, with public access blocked |
| `variables.tf` | Inputs, including `localstack_endpoint` — defaults to `localhost` for running Terraform directly, overridden to `host.docker.internal` when run from inside the Jenkins container |

LocalStack's EKS emulation is real, not simulated: it creates an actual [k3d](https://k3d.io/) cluster (genuine sibling Docker containers on the host) behind the scenes, so `kubectl` against it is exercising a real Kubernetes API server, cert-based mutual TLS, and RBAC — the same mechanics as a real cluster, just running locally instead of on AWS.

## Kubernetes manifests — `k8s/`

Files are numbered so `kubectl apply -f k8s/` applies them in dependency order (namespace before anything namespaced to it, ServiceAccount before the Deployment that references it, etc.) — no separate ordering steps needed.

| File | Purpose |
|---|---|
| `00-namespace.yaml` | The `article-platform` namespace everything else lives in |
| `01-configmap.yaml` | Non-secret app configuration (DB host, S3 bucket name, LocalStack endpoint, etc.) |
| `02-secret.yaml.example` | Template for the real `02-secret.yaml` (gitignored — contains actual DB password, session secret, etc.) |
| `03-serviceaccount.yaml` | The app's ServiceAccount, annotated with the IRSA role ARN from Terraform's output, granting pods S3 access without static credentials |
| `04-postgres-statefulset.yaml` | Postgres, with a `PersistentVolumeClaim` (`volumeClaimTemplates`) for its data directory |
| `05-postgres-service.yaml` | Headless `ClusterIP` service for Postgres |
| `06-deployment.yaml` | The app itself, pulling its image from GHCR |
| `07-app-service.yaml` | `NodePort` service exposing the app on port `30080` |
| `08-servicemonitor.yaml` | Tells Prometheus to scrape the app's `/metrics` endpoint |

## CI/CD

### GitHub Actions (`.github/workflows/ci-cd.yml`)

`build-and-install` → `lint-and-security-scan` → `test` → `build-and-push-image` (to GHCR) → `terraform-validate` → `validate-k8s-manifests`

### Jenkins (`Jenkinsfile`)

1. **Start LocalStack** — `docker compose up -d localstack`
2. **Wait for LocalStack** — polls `/_localstack/health` until ready
3. **Provision Infrastructure** — `terraform init` / `plan -out=tfplan` / `apply` against LocalStack (`dir('infra')`)
4. **Run on the cluster** — extracts the kubeconfig LocalStack's k3d cluster generated, patches its server address so it's reachable from inside the Jenkins container, injects the real `k8s/02-secret.yaml` from a Jenkins credential (never committed to git), and runs `kubectl apply -f k8s/`

Two Jenkins credentials back this pipeline: `localstack-auth-token` (Secret text, LocalStack Pro auth) and `k8s-secret-yaml` (Secret file, the real Kubernetes Secret manifest).

## Running the full pipeline locally

```bash
# 1. Bring up Jenkins (LocalStack is started by the pipeline itself)
cd jenkins
docker compose up -d

# 2. Open Jenkins at http://localhost:8080, add the two credentials above,
#    then trigger the pipeline (or push to main if polling/webhooks are configured)
```

When you're done, tear everything down — nothing here needs to stay running, since Terraform/Kubernetes state is fully reproducible from scratch on the next run:

```bash
docker compose down            # from repo root (app/db/localstack)
docker compose down            # from jenkins/

# LocalStack's k3d cluster runs as sibling containers, not tracked by either
# compose file — clean up any leftovers explicitly:
docker rm -f $(docker ps -aq --filter "name=k3d-article-platform") 2>/dev/null
```

## Known limitations of the LocalStack-based setup

- **State is ephemeral.** LocalStack loses all data on restart, so every run creates a brand-new EKS/k3d cluster from scratch. This is expected — Terraform detects the drift on the next `plan` and recreates everything, which is the point of infrastructure-as-code.
- **No real external exposure.** `NodePort`/`LoadBalancer` Services work at the Kubernetes level, but reaching them from outside Docker's internal network isn't possible without extra plumbing (`kubectl port-forward`, or exec'ing into a node container) — on real AWS, a `LoadBalancer` Service provisions an actual internet-facing ELB/NLB with no such limitation.
- **No EBS/EFS emulation.** The Postgres `PersistentVolumeClaim` is satisfied by k3d's local-path-provisioner (local disk inside the node container), not a real network-attached volume — fine for this project, but not representative of real cloud storage behavior.

## Project Structure

```
.
├── app.js                  # Express app setup, middleware, route mounting
├── server.js               # Application entry point
├── config/                 # Sequelize configuration
├── middleware/              # auth, admin, and upload middleware
├── migrations/              # Sequelize migrations
├── models/                  # Sequelize models
├── routes/                  # Express route handlers (auth, articles, complaints, admin)
├── seeders/                  # Sequelize seed scripts
├── views/                    # EJS templates
├── public/                   # Static assets
├── test/                     # Application tests
├── infra/                    # Terraform (VPC, EKS, IAM/OIDC/IRSA, S3) — targets LocalStack
├── k8s/                      # Kubernetes manifests
├── jenkins/                  # Jenkins's own Dockerfile + docker-compose.yml
├── Jenkinsfile                # Jenkins pipeline: provision infra + deploy to Kubernetes
├── docker-compose.yml         # App stack: db, app, localstack
├── .github/workflows/         # GitHub Actions: lint, test, build/push image, validate infra
└── package.json
```

## License

MIT
