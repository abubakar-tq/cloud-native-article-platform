const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const { Complaint, User, Article } = require('../models')
const asyncHandler = require('../utils/asyncHandler')
const { setFlash } = require('../middleware/flash')

// Submit complaint form
router.get('/new', requireAuth, (req, res) => {
    const targetType = req.query.type || 'general'
    const targetId = req.query.id || null

    res.render('complaints/new', {
        targetType,
        targetId,
        errors: []
    })
})

// Process complaint submission
router.post('/', requireAuth, asyncHandler(async(req, res) => {
    const { targetType, targetId, reason, description } = req.body
    const errors = []

    if (!reason) {
        errors.push('Please select a reason for your complaint.')
    }

    if (!description || description.trim().length < 10) {
        errors.push('Please provide a detailed description (at least 10 characters).')
    }

    if (errors.length > 0) {
        return res.status(400).render('complaints/new', {
            targetType: targetType || 'general',
            targetId: targetId || null,
            errors
        })
    }

    // Create the complaint
    await Complaint.create({
        userId: req.session.user.id,
        targetType: targetType || 'general',
        targetId: targetId ? parseInt(targetId) : null,
        reason,
        description: description.trim(),
        status: 'pending'
    })

    setFlash(req, 'success', 'Your complaint has been submitted successfully. An administrator will review it.')
    res.redirect('/')
}))

module.exports = router
