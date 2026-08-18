'use strict'

const express = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { User } = require('../models')
const { redirectIfAuthenticated } = require('../middleware/auth')
const { sendMail } = require('../utils/email')

const router = express.Router()

const OTP_EXPIRY_MINUTES = 10

const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
}

const setFlash = (req, type, message) => {
    if (req.session) {
        req.session.flash = { type, message }
    }
}

const normalizeEmail = (email) => (email || '').trim().toLowerCase()

const issueOtp = async(user) => {
    const otp = crypto.randomInt(100000, 1000000).toString()
    const otpHash = await bcrypt.hash(otp, 10)
    user.otpHash = otpHash
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
    await user.save()
    return otp
}

const sendVerificationEmail = async(email, otp) => {
    const from = process.env.EMAIL_FROM || 'DevOps Articles <noreply@tabeebemail.me>'
    const appName = process.env.APP_NAME || 'DevOps Articles'
    const appUrl = process.env.APP_URL || 'http://localhost:3000'

    await sendMail({
        from,
        to: email,
        subject: `🔐 ${appName} - Your Verification Code`,
        text: [
            `Welcome to ${appName}!`,
            '',
            `Your 6-digit verification code is: ${otp}`,
            '',
            `⏰ This code will expire in ${OTP_EXPIRY_MINUTES} minutes.`,
            '',
            '🔒 For your security:',
            '• Never share this code with anyone',
            '• We will never ask for this code over phone or email',
            '',
            `If you did not request this code, please ignore this email or contact support.`,
            '',
            `Visit: ${appUrl}`,
            '',
            'Best regards,',
            `The ${appName} Team`
        ].join('\n'),
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Verification Code - ${appName}</title>
            </head>
            <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px;">🏥 ${appName}</h1>
                        <p style="color: #f0f0f0; margin: 5px 0 0 0;">Medical Articles & Resources</p>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 40px 30px;">
                        <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px;">Welcome! Please verify your account</h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
                            Thank you for joining ${appName}. To complete your registration, please use the verification code below:
                        </p>
                        
                        <!-- OTP Box -->
                        <div style="background: #f8f9fa; border: 2px dashed #667eea; border-radius: 10px; padding: 25px; text-align: center; margin: 30px 0;">
                            <div style="color: #667eea; font-size: 14px; font-weight: bold; margin-bottom: 10px;">YOUR VERIFICATION CODE</div>
                            <div style="font-size: 36px; font-weight: bold; color: #333; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</div>
                            <div style="color: #999; font-size: 12px; margin-top: 10px;">⏰ Expires in ${OTP_EXPIRY_MINUTES} minutes</div>
                        </div>
                        
                        <!-- Security Notice -->
                        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 0 5px 5px 0;">
                            <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">🔒 Security Notice</h4>
                            <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 14px;">
                                <li>Never share this code with anyone</li>
                                <li>We will never ask for this code via phone or email</li>
                                <li>If you didn't request this, please ignore this email</li>
                            </ul>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; text-align: center; margin: 30px 0 0 0;">
                            Need help? Visit <a href="${appUrl}" style="color: #667eea; text-decoration: none;">${appName}</a> or contact our support team.
                        </p>
                    </div>
                    
                    <!-- Footer -->
                    <div style="background: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
                        <p style="color: #999; font-size: 12px; margin: 0;">
                            © 2025 ${appName} • Powered by tabeeb.email<br>
                            This email was sent to ${email}
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `
    })
}

router.get('/signup', redirectIfAuthenticated, (req, res) => {
    res.render('auth/signup', {
        email: req.query.email || '',
        errors: []
    })
})

router.post('/signup', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const emailRaw = req.body.email || ''
    const email = normalizeEmail(emailRaw)
    const errors = []

    if (!email) {
        errors.push('Email is required.')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Please provide a valid email address.')
    }

    if (errors.length > 0) {
        res.status(400).render('auth/signup', {
            email: emailRaw,
            errors
        })
        return
    }

    let user = await User.findOne({ where: { email } })

    if (user && user.isVerified) {
        setFlash(req, 'info', 'An account with that email already exists. Please sign in instead.')
        res.redirect('/auth/login')
        return
    }

    if (!user) {
        user = await User.create({ email })
    }

    const otp = await issueOtp(user)

    try {
        await sendVerificationEmail(email, otp)
    } catch (error) {
        console.error('Failed to send verification email:', error.message)
        setFlash(req, 'danger', 'We were unable to send the verification email. Please try again later.')
        res.redirect(`/auth/signup?email=${encodeURIComponent(email)}`)
        return
    }

    setFlash(req, 'success', 'Verification code sent! Please check your email.')
    res.redirect(`/auth/verify?email=${encodeURIComponent(email)}`)
}))

router.post('/resend', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const email = normalizeEmail(req.body.email)

    if (!email) {
        setFlash(req, 'danger', 'Provide an email address to resend the verification code.')
        res.redirect('/auth/signup')
        return
    }

    const user = await User.findOne({ where: { email } })

    if (!user) {
        setFlash(req, 'danger', 'No pending account found for that email. Please sign up first.')
        res.redirect(`/auth/signup?email=${encodeURIComponent(email)}`)
        return
    }

    if (user.isVerified) {
        setFlash(req, 'info', 'This account is already verified. You can sign in now.')
        res.redirect('/auth/login')
        return
    }

    const otp = await issueOtp(user)

    try {
        await sendVerificationEmail(email, otp)
    } catch (error) {
        console.error('Failed to send verification email:', error.message)
        setFlash(req, 'danger', 'We were unable to send the verification email. Please try again later.')
        res.redirect(`/auth/verify?email=${encodeURIComponent(email)}`)
        return
    }

    setFlash(req, 'success', 'We sent a new verification code to your email.')
    res.redirect(`/auth/verify?email=${encodeURIComponent(email)}`)
}))

router.get('/verify', redirectIfAuthenticated, (req, res) => {
    const emailRaw = req.query.email || ''

    if (!emailRaw) {
        setFlash(req, 'warning', 'Start verification by entering your email first.')
        res.redirect('/auth/signup')
        return
    }

    res.render('auth/verify', {
        email: emailRaw,
        errors: []
    })
})

router.post('/verify', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const emailRaw = req.body.email || ''
    const email = normalizeEmail(emailRaw)
    const otp = (req.body.otp || '').trim()
    const password = req.body.password || ''
    const confirmPassword = req.body.confirmPassword || ''
    const errors = []

    if (!email) {
        errors.push('Email is required.')
    }
    if (!otp) {
        errors.push('Verification code is required.')
    }
    if (!password) {
        errors.push('Password is required.')
    } else if (password.length < 8) {
        errors.push('Password must be at least 8 characters long.')
    }
    if (password && confirmPassword && password !== confirmPassword) {
        errors.push('Password confirmation does not match.')
    }

    if (errors.length > 0) {
        res.status(400).render('auth/verify', {
            email: emailRaw,
            errors
        })
        return
    }

    const user = await User.findOne({ where: { email } })

    if (!user) {
        setFlash(req, 'danger', 'We could not find an account for that email. Please sign up first.')
        res.redirect(`/auth/signup?email=${encodeURIComponent(emailRaw)}`)
        return
    }

    if (user.isVerified) {
        setFlash(req, 'info', 'Your account is already verified. Please sign in.')
        res.redirect('/auth/login')
        return
    }

    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt <= new Date()) {
        setFlash(req, 'danger', 'Your verification code expired. We sent you a new one.')
        const newOtp = await issueOtp(user)

        try {
            await sendVerificationEmail(email, newOtp)
        } catch (error) {
            console.error('Failed to resend verification email:', error.message)
            setFlash(req, 'danger', 'We were unable to send the verification email. Please try again later.')
        }

        res.redirect(`/auth/verify?email=${encodeURIComponent(email)}`)
        return
    }

    const otpMatches = await bcrypt.compare(otp, user.otpHash)

    if (!otpMatches) {
        res.status(400).render('auth/verify', {
            email: emailRaw,
            errors: ['Verification code is invalid.']
        })
        return
    }

    user.passwordHash = await bcrypt.hash(password, 10)
    user.isVerified = true
    user.otpHash = null
    user.otpExpiresAt = null
    await user.save()

    req.session.user = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin || false
    }
    const redirectTarget = req.session.redirectTo || '/articles'
    delete req.session.redirectTo

    setFlash(req, 'success', 'Your account is ready! You are now signed in.')
    res.redirect(redirectTarget)
}))

router.get('/login', redirectIfAuthenticated, (req, res) => {
    res.render('auth/login', {
        email: req.query.email || '',
        errors: []
    })
})

router.post('/login', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const emailRaw = req.body.email || ''
    const email = normalizeEmail(emailRaw)
    const password = req.body.password || ''
    const errors = []

    if (!email) {
        errors.push('Email is required.')
    }
    if (!password) {
        errors.push('Password is required.')
    }

    if (errors.length > 0) {
        res.status(400).render('auth/login', {
            email: emailRaw,
            errors
        })
        return
    }

    const user = await User.findOne({ where: { email } })

    if (!user || !user.isVerified || !user.passwordHash) {
        res.status(401).render('auth/login', {
            email: emailRaw,
            errors: ['Invalid email or password.']
        })
        return
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
        res.status(401).render('auth/login', {
            email: emailRaw,
            errors: ['Invalid email or password.']
        })
        return
    }

    const keepLoggedIn = req.body.keepLoggedIn === 'true'

    // Set extended session if "keep me logged in" is checked
    if (keepLoggedIn) {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
        req.session.keepLoggedIn = true
    }

    req.session.user = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin || false
    }
    req.session.loginTime = Date.now()

    // Redirect admins to admin dashboard, regular users to articles
    let redirectTarget = req.session.redirectTo
    if (!redirectTarget) {
        redirectTarget = (user.isAdmin) ? '/admin' : '/articles'
    }
    delete req.session.redirectTo

    setFlash(req, 'success', `Signed in successfully${keepLoggedIn ? ' (7 days)' : ''}.`)
    res.redirect(redirectTarget)
}))

// Logout route - supports both GET and POST
const handleLogout = asyncHandler(async(req, res) => {
    if (!req.session) {
        res.redirect('/auth/login')
        return
    }

    const wasAdmin = req.session.user && req.session.user.isAdmin

    req.session.user = null

    req.session.destroy((error) => {
        if (error) {
            console.error('Failed to destroy session on logout:', error.message)
        }

        // Redirect admin users to admin login, regular users to regular login
        if (wasAdmin) {
            res.redirect('/auth/admin/login')
        } else {
            res.redirect('/auth/login')
        }
    })
})

router.get('/logout', handleLogout)
router.post('/logout', handleLogout)

// Password Reset Token Constants
const RESET_TOKEN_EXPIRY_HOURS = 1

const generateResetToken = () => {
    return crypto.randomBytes(32).toString('hex')
}

const sendPasswordResetEmail = async(email, resetToken, req) => {
    const from = process.env.EMAIL_FROM || 'DevOps Articles <noreply@tabeebemail.me>'
    const appName = process.env.APP_NAME || 'DevOps Articles'

    // Build base URL from request or environment variable
    let baseUrl = process.env.APP_URL

    if (!baseUrl) {
        // Try to detect Railway domain
        if (process.env.RAILWAY_STATIC_URL) {
            baseUrl = process.env.RAILWAY_STATIC_URL
        } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
            baseUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        } else {
            // Fallback to request headers
            const protocol = req.get('x-forwarded-proto') || req.protocol || 'https'
            const host = req.get('x-forwarded-host') || req.get('host')
            baseUrl = `${protocol}://${host}`
        }
    }

    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`

    await sendMail({
        from,
        to: email,
        subject: `${appName} - Password Reset Request`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
                    .content { padding: 30px 0; }
                    .button { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="color: #6366f1; margin: 0;">🔐 Password Reset Request</h1>
                    </div>
                    
                    <div class="content">
                        <p>Hello,</p>
                        
                        <p>We received a request to reset your password for your <strong>${appName}</strong> account.</p>
                        
                        <p>Click the button below to create a new password:</p>
                        
                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" class="button">Reset My Password</a>
                        </p>
                        
                        <p><strong>This link will expire in ${RESET_TOKEN_EXPIRY_HOURS} hour${RESET_TOKEN_EXPIRY_HOURS > 1 ? 's' : ''}.</strong></p>
                        
                        <p>If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.</p>
                        
                        <p>For security, this reset link can only be used once.</p>
                    </div>
                    
                    <div class="footer">
                        <p>If the button doesn't work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
                        
                        <p style="margin-top: 20px;">
                            <strong>${appName}</strong><br>
                            This is an automated email, please don't reply.
                        </p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: [
            `Password Reset Request - ${appName}`,
            '',
            'We received a request to reset your password.',
            '',
            `Reset your password by clicking this link: ${resetUrl}`,
            '',
            `This link expires in ${RESET_TOKEN_EXPIRY_HOURS} hour${RESET_TOKEN_EXPIRY_HOURS > 1 ? 's' : ''}.`,
            '',
            'If you didn\'t request this reset, you can ignore this email.',
            'Your password will not be changed until you create a new one.',
            '',
            `- ${appName} Team`
        ].join('\n')
    })
}

// GET /auth/forgot-password - Show forgot password form
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
    res.render('auth/forgot-password', {
        email: req.query.email || '',
        errors: []
    })
})

// POST /auth/forgot-password - Send password reset email
router.post('/forgot-password', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const emailRaw = req.body.email || ''
    const email = normalizeEmail(emailRaw)
    const errors = []

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        errors.push('Please provide a valid email address.')
    }

    if (errors.length > 0) {
        res.status(400).render('auth/forgot-password', {
            email: emailRaw,
            errors
        })
        return
    }

    try {
        const user = await User.findOne({ where: { email } })

        if (user && user.isVerified) {
            // Generate reset token
            const resetToken = generateResetToken()
            const resetTokenHash = await bcrypt.hash(resetToken, 10)

            // Save token to user
            user.resetTokenHash = resetTokenHash
            user.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
            await user.save()

            // Send reset email
            await sendPasswordResetEmail(email, resetToken, req)
        }

        // Always show success message for security (don't reveal if email exists)
        setFlash(req, 'success', 'If an account with that email exists, we\'ve sent password reset instructions.')
        res.redirect('/auth/forgot-password')
    } catch (error) {
        console.error('Failed to send password reset email:', error.message)
        setFlash(req, 'danger', 'Unable to process password reset request. Please try again later.')
        res.redirect('/auth/forgot-password')
    }
}))

// GET /auth/reset-password - Show reset password form
router.get('/reset-password', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const token = req.query.token

    if (!token) {
        setFlash(req, 'danger', 'Invalid or missing reset token.')
        res.redirect('/auth/forgot-password')
        return
    }

    // Find user with valid token
    const users = await User.findAll({
        where: {
            resetTokenExpiresAt: {
                [require('sequelize').Op.gt]: new Date()
            }
        }
    })

    let validUser = null
    for (const user of users) {
        if (user.resetTokenHash && await bcrypt.compare(token, user.resetTokenHash)) {
            validUser = user
            break
        }
    }

    if (!validUser) {
        setFlash(req, 'danger', 'Invalid or expired reset token. Please request a new password reset.')
        res.redirect('/auth/forgot-password')
        return
    }

    res.render('auth/reset-password', {
        token,
        errors: []
    })
}))

// POST /auth/reset-password - Process password reset
router.post('/reset-password', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const token = req.body.token
    const password = req.body.password || ''
    const confirmPassword = req.body.confirmPassword || ''
    const errors = []

    // Validation
    if (!token) {
        errors.push('Invalid reset token.')
    }

    if (!password || password.length < 8) {
        errors.push('Password must be at least 8 characters long.')
    }

    if (password !== confirmPassword) {
        errors.push('Passwords do not match.')
    }

    if (errors.length > 0) {
        res.status(400).render('auth/reset-password', {
            token,
            errors
        })
        return
    }

    try {
        // Find user with valid token
        const users = await User.findAll({
            where: {
                resetTokenExpiresAt: {
                    [require('sequelize').Op.gt]: new Date()
                }
            }
        })

        let validUser = null
        for (const user of users) {
            if (user.resetTokenHash && await bcrypt.compare(token, user.resetTokenHash)) {
                validUser = user
                break
            }
        }

        if (!validUser) {
            setFlash(req, 'danger', 'Invalid or expired reset token. Please request a new password reset.')
            res.redirect('/auth/forgot-password')
            return
        }

        // Update password and clear reset token
        const passwordHash = await bcrypt.hash(password, 10)
        validUser.passwordHash = passwordHash
        validUser.resetTokenHash = null
        validUser.resetTokenExpiresAt = null
        await validUser.save()

        setFlash(req, 'success', 'Password updated successfully! You can now sign in with your new password.')
        res.redirect('/auth/login')
    } catch (error) {
        console.error('Failed to reset password:', error.message)
        setFlash(req, 'danger', 'Unable to reset password. Please try again.')
        res.status(500).render('auth/reset-password', {
            token,
            errors: ['Unable to reset password. Please try again.']
        })
    }
}))

// Admin Authentication Routes
router.get('/admin/login', redirectIfAuthenticated, (req, res) => {
    res.render('auth/admin-login', {
        email: req.query.email || '',
        errors: []
    })
})

router.post('/admin/login', redirectIfAuthenticated, asyncHandler(async(req, res) => {
    const emailRaw = req.body.email || ''
    const email = normalizeEmail(emailRaw)
    const password = req.body.password || ''
    const keepLoggedIn = req.body.keepLoggedIn === 'true'
    const errors = []

    if (!email) {
        errors.push('Email is required.')
    }
    if (!password) {
        errors.push('Password is required.')
    }

    if (errors.length > 0) {
        res.status(400).render('auth/admin-login', {
            email: emailRaw,
            errors
        })
        return
    }

    const user = await User.findOne({ where: { email } })

    if (!user || !user.isVerified || !user.passwordHash || !user.isAdmin) {
        res.status(401).render('auth/admin-login', {
            email: emailRaw,
            errors: ['Invalid admin credentials or insufficient privileges.']
        })
        return
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash)

    if (!passwordMatches) {
        res.status(401).render('auth/admin-login', {
            email: emailRaw,
            errors: ['Invalid admin credentials.']
        })
        return
    }

    // Set extended session if "keep me logged in" is checked
    if (keepLoggedIn) {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
        req.session.keepLoggedIn = true
    }

    req.session.user = {
        id: user.id,
        email: user.email,
        isAdmin: user.isAdmin
    }
    req.session.loginTime = Date.now()

    const redirectTarget = req.session.redirectTo || '/admin'
    delete req.session.redirectTo

    setFlash(req, 'success', `Welcome, Administrator! ${keepLoggedIn ? '(7 days)' : ''}`)
    res.redirect(redirectTarget)
}))

// Test OTP email endpoint for development/testing
router.get('/test-otp-email', asyncHandler(async(req, res) => {
    const testEmail = req.query.email || 'test@example.com'
    const testOtp = crypto.randomInt(100000, 999999).toString()
    
    try {
        await sendVerificationEmail(testEmail, testOtp)
        
        res.json({
            success: true,
            message: `OTP verification email sent successfully to ${testEmail}`,
            otp: testOtp, // Only for testing - remove in production
            configuration: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                from: process.env.EMAIL_FROM || 'Not configured',
                apiKeyConfigured: !!process.env.POSTAL_API_KEY
            }
        })
    } catch (error) {
        console.error('Failed to send OTP email:', error.message)
        
        res.json({
            success: false,
            message: `Failed to send OTP email: ${error.message}`,
            configuration: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                from: process.env.EMAIL_FROM || 'Not configured',
                apiKeyConfigured: !!process.env.POSTAL_API_KEY
            }
        })
    }
}))

// Test email endpoint for development/testing
router.get('/test-email', asyncHandler(async(req, res) => {
    const testEmail = req.query.email || 'test@example.com'
    
    try {
        await sendMail({
            to: testEmail,
            subject: 'Tabeeb.email Test - Postal Configuration',
            text: [
                'This is a test email from your DevOps Articles application.',
                '',
                'Email service configuration:',
                `- Server: ${process.env.POSTAL_SERVER || 'Not configured'}`,
                `- From: ${process.env.EMAIL_FROM || 'Not configured'}`,
                `- API Key: ${process.env.POSTAL_API_KEY ? 'Configured' : 'Not configured'}`,
                '',
                'If you received this email, your Postal configuration is working correctly!',
                '',
                `Test sent at: ${new Date().toISOString()}`
            ].join('\n'),
            html: [
                '<h2>🎉 Tabeeb.email Test - Postal Configuration</h2>',
                '<p>This is a test email from your DevOps Articles application.</p>',
                '<h3>📧 Email service configuration:</h3>',
                '<ul>',
                `<li><strong>Server:</strong> ${process.env.POSTAL_SERVER || 'Not configured'}</li>`,
                `<li><strong>From:</strong> ${process.env.EMAIL_FROM || 'Not configured'}</li>`,
                `<li><strong>API Key:</strong> ${process.env.POSTAL_API_KEY ? '✅ Configured' : '❌ Not configured'}</li>`,
                '</ul>',
                '<p><strong>✅ If you received this email, your Postal configuration is working correctly!</strong></p>',
                `<p><small>Test sent at: ${new Date().toISOString()}</small></p>`
            ].join('')
        })
        
        res.json({
            success: true,
            message: `Test email sent successfully to ${testEmail}`,
            configuration: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                from: process.env.EMAIL_FROM || 'Not configured',
                apiKeyConfigured: !!process.env.POSTAL_API_KEY
            }
        })
    } catch (error) {
        console.error('Test email failed:', error.message)
        res.status(500).json({
            success: false,
            message: `Failed to send test email: ${error.message}`,
            configuration: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                from: process.env.EMAIL_FROM || 'Not configured',
                apiKeyConfigured: !!process.env.POSTAL_API_KEY
            }
        })
    }
}))

// Test Postal connection (without sending email)
router.get('/test-postal-connection', asyncHandler(async(req, res) => {
    try {
        // Test 1: Check if we can reach the Postal server
        const axios = require('axios')
        const testUrl = `https://${process.env.POSTAL_SERVER || 'postal.mailsytems.live'}/api/v1/servers`
        
        console.log(`Testing connection to: ${testUrl}`)
        
        const response = await axios.get(testUrl, {
            headers: {
                'X-Server-API-Key': process.env.POSTAL_API_KEY || 'test'
            },
            timeout: 10000
        })
        
        res.json({
            success: true,
            message: 'Successfully connected to Postal server!',
            serverResponse: response.status,
            configuration: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                from: process.env.EMAIL_FROM || 'Not configured',
                apiKeyConfigured: !!process.env.POSTAL_API_KEY,
                testUrl: testUrl
            }
        })
    } catch (error) {
        console.error('Postal connection test failed:', error.message)
        
        res.json({
            success: false,
            message: `Connection test failed: ${error.message}`,
            error: error.code || 'UNKNOWN_ERROR',
            configuration: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                from: process.env.EMAIL_FROM || 'Not configured',
                apiKeyConfigured: !!process.env.POSTAL_API_KEY
            },
            suggestion: 'This might be due to missing DNS records or incorrect API key'
        })
    }
}))

// Comprehensive email service status and testing endpoint
router.get('/test-email-services', asyncHandler(async(req, res) => {
    const testEmail = req.query.email || 'test@example.com'
    const emailServices = {
        postal_http: {
            configured: !!process.env.POSTAL_API_KEY && !!process.env.POSTAL_SERVER,
            details: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                port: process.env.POSTAL_PORT || '587',
                apiKey: process.env.POSTAL_API_KEY ? '✅ Configured' : '❌ Not configured'
            }
        },
        postal_smtp: {
            configured: !!process.env.POSTAL_API_KEY && !!process.env.POSTAL_SERVER,
            details: {
                server: process.env.POSTAL_SERVER || 'Not configured',
                port: process.env.POSTAL_PORT || '587',
                username: process.env.POSTAL_USERNAME || 'apikey',
                apiKey: process.env.POSTAL_API_KEY ? '✅ Configured' : '❌ Not configured'
            }
        },
        resend: {
            configured: !!process.env.RESEND_API_KEY,
            details: {
                apiKey: process.env.RESEND_API_KEY ? '✅ Configured' : '❌ Not configured',
                keyPrefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'Not set'
            }
        }
    }

    if (req.query.send === 'true') {
        try {
            await sendMail({
                to: testEmail,
                subject: '📧 Email Service Status Test',
                text: 'This is a test email from your DevOps Articles application.',
                html: `
                    <h2>📧 Email Service Status Test</h2>
                    <p>This email was sent successfully!</p>
                    <p>Configured services:</p>
                    <ul>
                        <li>Postal HTTP API: ${emailServices.postal_http.configured ? '✅' : '❌'}</li>
                        <li>Postal SMTP: ${emailServices.postal_smtp.configured ? '✅' : '❌'}</li>
                        <li>Resend API: ${emailServices.resend.configured ? '✅' : '❌'}</li>
                    </ul>
                `
            })

            res.json({
                success: true,
                message: `Test email sent to ${testEmail}`,
                emailServices,
                fallbackChain: [
                    'Postal HTTP API',
                    'Postal SMTP',
                    'Resend API',
                    'Mock Service (Development Only)'
                ]
            })
        } catch (error) {
            console.error('Email test failed:', error.message)
            res.json({
                success: false,
                message: `Failed to send test email: ${error.message}`,
                emailServices,
                error: error.message
            })
        }
    } else {
        res.json({
            success: true,
            message: 'Email service status check',
            emailServices,
            fallbackChain: [
                '1. Postal HTTP API - Primary',
                '2. Postal SMTP - Secondary',
                '3. Resend API - Tertiary',
                '4. Mock Service - Fallback (Development Only)'
            ],
            testUrl: 'http://localhost:3000/auth/test-email-services?email=your@email.com&send=true'
        })
    }
}))

module.exports = router
