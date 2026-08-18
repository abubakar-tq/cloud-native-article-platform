'use strict'

const { Resend } = require('resend')

/**
 * Send email using Resend API with fallback to mock service
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 * @param {string} options.from - Sender email (optional)
 */
const sendMail = async(options) => {
    const defaultFrom = process.env.EMAIL_FROM || 'DevOps Articles <noreply@tabeebemail.me>'
    const emailFrom = options.from || defaultFrom

    // Try Resend API
    if (process.env.RESEND_API_KEY) {
        try {
            console.log('📧 Sending email via Resend API...')
            const resend = new Resend(process.env.RESEND_API_KEY)
            
            const emailData = {
                from: emailFrom,
                to: options.to,
                subject: options.subject,
                text: options.text
            }

            if (options.html) {
                emailData.html = options.html
            }

            const result = await resend.emails.send(emailData)

            if (result.error) {
                throw new Error(result.error.message || 'Unknown Resend API error')
            }

            console.log('✅ Email sent successfully via Resend:', result.data?.id)
            return result
        } catch (error) {
            console.log('⚠️ Resend API failed:', error.message)
        }
    }

    // Fallback to mock service (development/testing only)
    console.log('📧 Using MOCK EMAIL SERVICE (development only)')
    console.log('📬 MOCK EMAIL:')
    console.log(`   To: ${options.to}`)
    console.log(`   From: ${emailFrom}`)
    console.log(`   Subject: ${options.subject}`)
    console.log('---')

    return {
        data: { id: 'mock-email-' + Date.now() },
        error: null
    }
}

module.exports = {
    sendMail
}
