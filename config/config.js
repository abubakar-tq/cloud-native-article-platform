// Load .env only for non-production environments
if (process.env.NODE_ENV !== 'production') {
    try {
        require('dotenv').config()
    } catch (error) {
        // ignore if dotenv or .env is not present
    }
}

const connectTimeoutDialectOptions = { connectTimeout: 60000 }
const nonSslDialectOptions = { ...connectTimeoutDialectOptions }
const sslDialectOptions = {
    ...connectTimeoutDialectOptions,
    ssl: { require: true, rejectUnauthorized: false }
}

// Allow K8s/local Postgres without SSL by setting DB_SSL=false
const shouldUseSSL = process.env.DB_SSL !== 'false'

module.exports = {
    development: {
        // All values come from environment variables; no hardcoded secrets here.
        username: process.env.DB_USERNAME || null,
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME || null,
        host: process.env.DB_HOST || null,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        dialect: 'postgres',
        dialectOptions: nonSslDialectOptions
    },
    test: {
        username: process.env.TEST_DB_USERNAME || null,
        password: process.env.TEST_DB_PASSWORD || null,
        database: process.env.TEST_DB_NAME || null,
        host: process.env.TEST_DB_HOST || null,
        port: process.env.TEST_DB_PORT ? Number(process.env.TEST_DB_PORT) : undefined,
        dialect: 'postgres',
        dialectOptions: nonSslDialectOptions
    },
    docker: {
        username: process.env.DB_USERNAME || null,
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME || null,
        host: process.env.DB_HOST || null,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        dialect: 'postgres',
        dialectOptions: shouldUseSSL ? sslDialectOptions : nonSslDialectOptions
    },
    production: {
        // In production, use individual DB parameters for better control
        username: process.env.DB_USERNAME || null,
        password: process.env.DB_PASSWORD || null,
        database: process.env.DB_NAME || null,
        host: process.env.DB_HOST || null,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
        dialect: 'postgres',
        dialectOptions: shouldUseSSL ? sslDialectOptions : nonSslDialectOptions,
        logging: false
    }
}
