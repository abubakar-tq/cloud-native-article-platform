'use strict'

const multer = require('multer')
const multerS3 = require('multer-s3')
const { S3Client } = require('@aws-sdk/client-s3')

// Initialize S3 client (will use IAM role in EKS)
// AWS_ENDPOINT_URL is only set for local dev against LocalStack; real AWS ignores it.
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    ...(process.env.AWS_ENDPOINT_URL && {
        endpoint: process.env.AWS_ENDPOINT_URL,
        forcePathStyle: true
    })
})

const S3_BUCKET = process.env.S3_UPLOADS_BUCKET || 'devops-articles-uploads'

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
        return
    }

    const allowedDocuments = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (allowedDocuments.includes(file.mimetype)) {
        cb(null, true)
        return
    }

    cb(new Error('Unsupported file type. Images, PDFs, and Word documents only.'))
}

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: S3_BUCKET,
        metadata: (req, file, cb) => {
            cb(null, {
                fieldName: file.fieldname,
                originalName: file.originalname
            })
        },
        key: (req, file, cb) => {
            const subDir = file.mimetype.startsWith('image/') ? 'images' : 'documents'
            const timestamp = Date.now()
            const sanitizedOriginal = file.originalname.replace(/\s+/g, '-')
            const key = `${subDir}/${timestamp}-${sanitizedOriginal}`
            cb(null, key)
        }
    }),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    },
    fileFilter
})

module.exports = {
    upload,
    s3Client,
    S3_BUCKET
}
