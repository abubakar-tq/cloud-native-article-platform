# Article Management System

A Node.js/Express web application for creating, publishing, and moderating articles, built on Sequelize and PostgreSQL. It includes user authentication with email verification, an admin panel, a complaints workflow, and file uploads for article media.

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

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15
- An AWS S3 bucket (for article media uploads)

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
└── package.json
```

## License

MIT
