'use strict'

const wantsJson = (req) => req.accepts(['html', 'json']) === 'json'

const requireAdmin = (req, res, next) => {
    if (!req.session || !req.session.user) {
        if (wantsJson(req)) {
            res.status(401).json({ message: 'Authentication required.' })
            return
        }

        req.session.redirectTo = req.originalUrl
        req.session.flash = {
            type: 'warning',
            message: 'Please sign in as an administrator to continue.'
        }
        res.redirect('/auth/admin/login')
        return
    }

    if (!req.session.user.isAdmin) {
        if (wantsJson(req)) {
            res.status(403).json({ message: 'Administrator access required.' })
            return
        }

        req.session.flash = {
            type: 'danger',
            message: 'Administrator access required.'
        }
        res.redirect('/articles')
        return
    }

    next()
}

module.exports = {
    requireAdmin
}
