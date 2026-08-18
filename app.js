const path = require('path')
const express = require('express')
const morgan = require('morgan')
const session = require('express-session')
const methodOverride = require('method-override')
const articlesRouter = require('./routes/articles')
const authRouter = require('./routes/auth')
const { requireAuth, blockAdminFromUserRoutes } = require('./middleware/auth')

const isProduction = process.env.NODE_ENV === 'production'
const app = express()
const sessionSecret = process.env.SESSION_SECRET || 'change-me'

// Configure session store for production
let sessionStore
if (isProduction) {
    const pgSession = require('connect-pg-simple')(session)

    sessionStore = new pgSession({
        conObject: {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 5432),
            database: process.env.DB_NAME,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            ssl: (process.env.DB_SSL === 'false') ? undefined : { rejectUnauthorized: false }
        },
        createTableIfMissing: true,
        tableName: 'session'
    })
}

if (isProduction) {
    app.set('trust proxy', 1)
}

app.disable('x-powered-by')
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'))
app.use(morgan(isProduction ? 'combined' : 'dev'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore, // Use PostgreSQL store in production, MemoryStore in dev
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        // Only use secure cookies if explicitly set to 'true', not just in production
        // This allows HTTP deployments in K8s/AWS without HTTPS
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}))

app.use((req, res, next) => {
    // Check for session expiry
    let showReloginPopup = false

    if (req.session && req.session.user && req.session.loginTime) {
        const now = Date.now()
        const loginTime = req.session.loginTime
        const sessionAge = now - loginTime
        const maxAge = req.session.keepLoggedIn ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        const warningThreshold = maxAge - (2 * 60 * 60 * 1000) // 2 hours before expiry

        if (sessionAge > maxAge) {
            // Session expired
            req.session.user = null
            req.session.flash = { type: 'warning', message: 'Your session has expired. Please sign in again.' }
        } else if (sessionAge > warningThreshold && !req.session.reloginWarningShown) {
            // Show warning popup
            showReloginPopup = true
            req.session.reloginWarningShown = true
        }
    }

    res.locals.currentUser = req.session && req.session.user ? req.session.user : null
    res.locals.flash = req.session && req.session.flash ? req.session.flash : null
    res.locals.showReloginPopup = showReloginPopup

    if (req.session && req.session.flash) {
        delete req.session.flash
    }

    next()
})

app.set('view engine', 'ejs')

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() })
})

app.get('/', blockAdminFromUserRoutes, (req, res) => {
    res.redirect('/articles')
})

app.use('/auth', authRouter)
app.use('/admin', require('./routes/admin'))
app.use('/complaints', require('./routes/complaints'))
app.use('/articles', requireAuth, blockAdminFromUserRoutes, articlesRouter)

app.use((req, res) => {
    const message = 'Route Not Found'
    const details = 'The page you requested could not be found.'

    if (req.accepts(['html', 'json']) === 'json') {
        res.status(404).json({ message, details })
        return
    }

    res.status(404).render('error', { message, error: details })
})

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status || 500
    const message = err.message || 'Internal Server Error'
    const details = Array.isArray(err.details)
        ? err.details.join(', ')
        : err.details || 'An unexpected error occurred.'

    if (req.accepts(['html', 'json']) === 'json') {
        const payload = { message }

        if (Array.isArray(err.details)) {
            payload.details = err.details
        } else if (details !== 'An unexpected error occurred.') {
            payload.details = details
        }

        res.status(status).json(payload)
        return
    }

    res.status(status).render('error', { message, error: details })
})

module.exports = app
