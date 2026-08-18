const express = require('express')
const router = express.Router()
const { requireAdmin } = require('../middleware/admin')
const { Article, User, Complaint } = require('../models')
const asyncHandler = require('../utils/asyncHandler')
const { setFlash } = require('../middleware/flash')
const { Op } = require('sequelize')

// Admin Dashboard
router.get('/', requireAdmin, asyncHandler(async(req, res) => {
    const articleCount = await Article.count({ where: { isHidden: false } })
    const hiddenArticleCount = await Article.count({ where: { isHidden: true } })
    const userCount = await User.count({ where: { isBlocked: false } })
    const blockedUserCount = await User.count({ where: { isBlocked: true } })
    const adminCount = await User.count({ where: { isAdmin: true } })
    const pendingComplaints = await Complaint.count({ where: { status: 'pending' } })

    res.render('admin/dashboard', {
        articleCount,
        hiddenArticleCount,
        userCount,
        blockedUserCount,
        adminCount,
        pendingComplaints
    })
}))

// User Management
router.get('/users', requireAdmin, asyncHandler(async(req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit
    const search = req.query.search || ''

    const whereClause = search ? {
        email: { [Op.iLike]: `%${search}%` }
    } : {}

    const { rows: users, count } = await User.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [{
            model: Article,
            as: 'articles',
            attributes: ['id']
        }]
    })

    const totalPages = Math.ceil(count / limit)

    res.render('admin/users', {
        users,
        currentPage: page,
        totalPages,
        search,
        totalUsers: count
    })
}))

// Block/Unblock User
router.post('/users/:id/toggle-block', requireAdmin, asyncHandler(async(req, res) => {
    const user = await User.findByPk(req.params.id)
    if (!user) {
        setFlash(req, 'danger', 'User not found.')
        return res.redirect('/admin/users')
    }

    if (user.isAdmin) {
        setFlash(req, 'danger', 'Cannot block administrator users.')
        return res.redirect('/admin/users')
    }

    const isBlocked = !user.isBlocked
    await user.update({
        isBlocked,
        blockedAt: isBlocked ? new Date() : null,
        blockedBy: isBlocked ? req.session.user.id : null
    })

    setFlash(req, 'success', `User ${isBlocked ? 'blocked' : 'unblocked'} successfully.`)
    res.redirect('/admin/users')
}))

// Article Management
router.get('/articles', requireAdmin, asyncHandler(async(req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit
    const search = req.query.search || ''
    const status = req.query.status || 'all' // all, visible, hidden

    let whereClause = {}
    if (search) {
        whereClause.title = { [Op.iLike]: `%${search}%` }
    }
    if (status === 'visible') {
        whereClause.isHidden = false
    } else if (status === 'hidden') {
        whereClause.isHidden = true
    }

    const { rows: articles, count } = await Article.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [{
            model: User,
            as: 'owner',
            attributes: ['id', 'email']
        }]
    })

    const totalPages = Math.ceil(count / limit)

    res.render('admin/articles', {
        articles,
        currentPage: page,
        totalPages,
        search,
        status,
        totalArticles: count
    })
}))

// Hide/Show Article
router.post('/articles/:id/toggle-visibility', requireAdmin, asyncHandler(async(req, res) => {
    const article = await Article.findByPk(req.params.id)
    if (!article) {
        setFlash(req, 'danger', 'Article not found.')
        return res.redirect('/admin/articles')
    }

    const isHidden = !article.isHidden
    await article.update({
        isHidden,
        hiddenAt: isHidden ? new Date() : null,
        hiddenBy: isHidden ? req.session.user.id : null
    })

    setFlash(req, 'success', `Article ${isHidden ? 'hidden' : 'made visible'} successfully.`)
    res.redirect('/admin/articles')
}))

// Complaints Management
router.get('/complaints', requireAdmin, asyncHandler(async(req, res) => {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit
    const status = req.query.status || 'pending'

    const whereClause = status === 'all' ? {} : { status }

    const { rows: complaints, count } = await Complaint.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
            {
                model: User,
                as: 'reporter',
                attributes: ['id', 'email']
            },
            {
                model: User,
                as: 'resolver',
                attributes: ['id', 'email']
            }
        ]
    })

    const totalPages = Math.ceil(count / limit)

    res.render('admin/complaints', {
        complaints,
        currentPage: page,
        totalPages,
        status,
        totalComplaints: count
    })
}))

// Resolve Complaint
router.post('/complaints/:id/resolve', requireAdmin, asyncHandler(async(req, res) => {
    const complaint = await Complaint.findByPk(req.params.id)
    if (!complaint) {
        setFlash(req, 'danger', 'Complaint not found.')
        return res.redirect('/admin/complaints')
    }

    await complaint.update({
        status: 'resolved',
        resolvedBy: req.session.user.id,
        resolvedAt: new Date()
    })

    setFlash(req, 'success', 'Complaint resolved successfully.')
    res.redirect('/admin/complaints')
}))

module.exports = router
