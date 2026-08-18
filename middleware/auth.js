'use strict'

const { User } = require('../models')

const wantsJson = (req) => req.accepts(['html', 'json']) === 'json'

const requireAuth = async(req, res, next) => {
    if (req.session && req.session.user) {
        // Check if user is blocked
        try {
            const user = await User.findByPk(req.session.user.id)
            if (user && user.isBlocked) {
                // Clear session for blocked user
                req.session.destroy()

                if (wantsJson(req)) {
                    res.status(403).json({ message: 'Your account has been blocked.' })
                    return
                }

                res.status(403).render('auth/blocked')
                return
            }
        } catch (error) {
            console.error('Error checking user status:', error)
        }

        next()
        return
    }

    if (wantsJson(req)) {
        res.status(401).json({ message: 'Authentication required.' })
        return
    }

    if (req.session) {
        req.session.redirectTo = req.originalUrl
        req.session.flash = {
            type: 'warning',
            message: 'Please sign in to continue.'
        }
    }

    res.redirect('/auth/login')
}

const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        res.redirect('/articles')
        return
    }

    next()
}

// Block admins from accessing regular user features - admins are admin-only
const blockAdminFromUserRoutes = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.isAdmin) {
        // Define allowed routes for admins
        const allowedAdminRoutes = [
            '/admin',           // Admin panel
            '/auth/logout',     // Logout
            '/auth/admin',      // Admin auth routes
            '/health',          // Health check
            '/uploads',         // File access
            '/css',             // Static assets
            '/js'              // Static assets
        ]

        // Check if current path is allowed for admins
        const isAllowedRoute = allowedAdminRoutes.some(route => req.path.startsWith(route))

        if (!isAllowedRoute) {
            // Block admin from regular user routes
            if (wantsJson(req)) {
                return res.status(403).json({
                    message: 'Administrators cannot access regular user features. Please use the admin panel.'
                })
            }

            req.session.flash = {
                type: 'warning',
                message: 'Administrators can only access admin features. You have been redirected to the admin panel.'
            }
            return res.redirect('/admin')
        }
    }
    next()
}

module.exports = {
    requireAuth,
    redirectIfAuthenticated,
    blockAdminFromUserRoutes
}
