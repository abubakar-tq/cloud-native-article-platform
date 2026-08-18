'use strict'

const fs = require('fs')
const path = require('path')
const express = require('express')
const sanitizeHtml = require('sanitize-html')
const { Article, ArticleMedia, User, Sequelize } = require('../models')
const { upload, s3Client, S3_BUCKET } = require('../middleware/uploads')
const { GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')

const { Op } = Sequelize
const router = express.Router()

const wantsJson = (req) => req.accepts(['html', 'json']) === 'json'

const normalizeApproved = (value) => {
    if (typeof value === 'string') {
        return ['true', '1', 'yes', 'on'].includes(value.toLowerCase())
    }

    return Boolean(value)
}

const normalizeVisibility = (value) => (value === 'public' ? 'public' : 'private')

const buildSearchClause = (term) => {
    const trimmed = (term || '').trim()

    if (!trimmed) {
        return null
    }

    const likeOperator = Op.iLike || Op.like

    return {
        [Op.or]: [
            { title: { [likeOperator]: `%${trimmed}%` } },
            { body: { [likeOperator]: `%${trimmed}%` } }
        ]
    }
}

const assertOwnership = (article, userId) => {
    if (article.userId && article.userId !== userId) {
        const error = new Error('Forbidden')
        error.status = 403
        error.details = 'You do not have permission to modify this article.'
        throw error
    }
}

const asyncHandler = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
}

const getS3SignedUrl = async(s3Key) => {
    if (!s3Key) return null
    try {
        const command = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key
        })
        return await getSignedUrl(s3Client, command, { expiresIn: 3600 })
    } catch (error) {
        console.error('Error generating signed URL:', error)
        return null
    }
}

const deleteS3Object = async(s3Key) => {
    if (!s3Key) return
    try {
        await s3Client.send(new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: s3Key
        }))
    } catch (error) {
        console.error('Error deleting S3 object:', error)
    }
}

const sanitizeContent = (content) => sanitizeHtml(content || '', {
    allowedTags: [
        'p', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
        'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'img',
        'hr', 'br', 'span', 'div'
    ],
    allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        '*': ['style']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    transformTags: {
        a: (tagName, attribs) => ({
            tagName,
            attribs: {
                ...attribs,
                rel: 'noopener noreferrer',
                target: attribs.target || '_blank'
            }
        })
    }
})

const buildEmbeddableUrl = (url) => {
    if (!url) {
        return null
    }

    try {
        const trimmed = url.trim()

        if (trimmed.includes('youtube.com/watch')) {
            const urlObj = new URL(trimmed)
            const videoId = urlObj.searchParams.get('v')
            return videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed
        }

        if (trimmed.includes('youtu.be/')) {
            const videoId = trimmed.split('youtu.be/')[1].split(/[?&]/)[0]
            return `https://www.youtube.com/embed/${videoId}`
        }

        if (trimmed.includes('drive.google.com')) {
            const match = trimmed.match(/\/d\/([\w-]+)/)
            const fileId = match ? match[1] : null

            if (fileId) {
                return `https://drive.google.com/file/d/${fileId}/preview`
            }

            const altMatch = trimmed.match(/id=([\w-]+)/)
            if (altMatch) {
                return `https://drive.google.com/file/d/${altMatch[1]}/preview`
            }
        }

        return trimmed
    } catch (error) {
        return url
    }
}

const saveMediaRecords = async(article, files, videoLinks) => {
    const tasks = []

    const imageFiles = files.images || []
    const documentFiles = files.documents || []

    imageFiles.forEach(file => {
        tasks.push(
            ArticleMedia.create({
                articleId: article.id,
                type: 'image',
                title: file.originalname,
                storagePath: file.key || file.location // S3 key
            })
        )
    })

    documentFiles.forEach(file => {
        tasks.push(
            ArticleMedia.create({
                articleId: article.id,
                type: 'document',
                title: file.originalname,
                storagePath: file.key || file.location // S3 key
            })
        )
    })

    const uniqueVideoLinks = Array.from(new Set(
        videoLinks
            .map((link) => (typeof link === 'string' ? link.trim() : link))
            .filter(Boolean)
    ))

    uniqueVideoLinks.forEach((link) => {
        tasks.push(
            ArticleMedia.create({
                articleId: article.id,
                type: 'video',
                externalUrl: link
            })
        )
    })

    await Promise.all(tasks)
}

const deleteMediaRecords = async(mediaIds = [], userId) => {
    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return
    }

    const records = await ArticleMedia.findAll({
        where: { id: mediaIds },
        include: [{
            model: Article,
            as: 'article',
            attributes: ['id', 'userId']
        }]
    })

    const deletions = records
        .filter(record => record.article && record.article.userId === userId)
        .map(async(record) => {
            if (record.storagePath && record.type !== 'video') {
                await deleteS3Object(record.storagePath)
            }

            await record.destroy()
        })

    await Promise.all(deletions)
}

router.get('/', asyncHandler(async(req, res) => {
    const searchTerm = (req.query.search || '').trim()
    const where = {
        visibility: 'public',
        isHidden: false  // Hide articles that have been hidden by admin
    }
    const searchClause = buildSearchClause(searchTerm)

    if (searchClause) {
        Object.assign(where, searchClause)
    }

    const articles = await Article.findAll({
        where,
        include: [
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'email']
            },
            {
                model: ArticleMedia,
                as: 'media'
            }
        ],
        order: [['createdAt', 'DESC']]
    })

    if (wantsJson(req)) {
        res.status(200).json({ articles, searchTerm })
        return
    }

    // Generate signed URLs for S3 media
    const articlesWithUrls = await Promise.all(articles.map(async(article) => {
        const articlePlain = article.get({ plain: true })
        const mediaWithUrls = await Promise.all((articlePlain.media || []).map(async(media) => {
            if (media.type === 'video') {
                return { ...media, embedUrl: buildEmbeddableUrl(media.externalUrl) }
            }
            
            if (media.storagePath) {
                const signedUrl = await getS3SignedUrl(media.storagePath)
                return { ...media, url: signedUrl }
            }
            
            return media
        }))
        
        return { ...articlePlain, media: mediaWithUrls }
    }))

    res.status(200).render('index', {
        articles: articlesWithUrls,
        searchTerm,
        currentUserId: req.session && req.session.user ? req.session.user.id : null
    })
}))

router.get('/mine', asyncHandler(async(req, res) => {
    const userId = req.session.user.id
    const searchTerm = (req.query.search || '').trim()
    const where = { userId }
    const searchClause = buildSearchClause(searchTerm)

    if (searchClause) {
        Object.assign(where, searchClause)
    }

    const articles = await Article.findAll({
        where,
        include: [
            {
                model: ArticleMedia,
                as: 'media'
            }
        ],
        order: [['createdAt', 'DESC']]
    })

    const privateArticles = articles.filter(article => article.visibility === 'private')
    const publicArticles = articles.filter(article => article.visibility === 'public')

    if (wantsJson(req)) {
        res.status(200).json({
            private: privateArticles,
            public: publicArticles,
            searchTerm
        })
        return
    }

    // Generate signed URLs for S3 media
    const processArticles = async(articleList) => {
        return await Promise.all(articleList.map(async(article) => {
            const articlePlain = article.get({ plain: true })
            const mediaWithUrls = await Promise.all((articlePlain.media || []).map(async(media) => {
                if (media.type === 'video') {
                    return { ...media, embedUrl: buildEmbeddableUrl(media.externalUrl) }
                }
                
                if (media.storagePath) {
                    const signedUrl = await getS3SignedUrl(media.storagePath)
                    return { ...media, url: signedUrl }
                }
                
                return media
            }))
            
            return { ...articlePlain, media: mediaWithUrls }
        }))
    }

    const privateArticlesWithUrls = await processArticles(privateArticles)
    const publicArticlesWithUrls = await processArticles(publicArticles)

    res.status(200).render('mine', {
        privateArticles: privateArticlesWithUrls,
        publicArticles: publicArticlesWithUrls,
        searchTerm
    })
}))

router.get('/create', (req, res) => {
    const defaultVisibility = normalizeVisibility(req.query.visibility || 'private')

    res.render('create', {
        defaultVisibility,
        selectedVisibility: defaultVisibility, // Add this for template compatibility
        title: '',
        body: '',
        approved: false,
        videoLinks: ['']
    })
})

router.get('/update/:id', asyncHandler(async(req, res, next) => {
    const article = await Article.findByPk(req.params.id, {
        include: [
            {
                model: ArticleMedia,
                as: 'media'
            }
        ]
    })

    if (!article) {
        const error = new Error('Article Not Found')
        error.status = 404
        error.details = 'The article you are trying to update does not exist.'
        return next(error)
    }

    try {
        assertOwnership(article, req.session.user.id)
    } catch (error) {
        return next(error)
    }

    res.render('update', { article })
}))

router.get('/:id', asyncHandler(async(req, res, next) => {
    const article = await Article.findByPk(req.params.id, {
        include: [
            {
                model: User,
                as: 'owner',
                attributes: ['id', 'email']
            },
            {
                model: ArticleMedia,
                as: 'media'
            }
        ]
    })

    if (!article) {
        const error = new Error('Article Not Found')
        error.status = 404
        error.details = 'The article you are looking for could not be located.'
        return next(error)
    }

    const isOwner = req.session.user && article.userId === req.session.user.id

    if (article.visibility === 'private' && !isOwner) {
        const error = new Error('Article Not Found')
        error.status = 404
        error.details = 'The article you are looking for could not be located.'
        return next(error)
    }

    if (wantsJson(req)) {
        res.status(200).json(article)
        return
    }

    const articlePlain = article.get({ plain: true })
    
    // Generate signed URLs for S3 media
    const mediaWithUrls = await Promise.all((articlePlain.media || []).map(async(media) => {
        if (media.type === 'video') {
            return { ...media, embedUrl: buildEmbeddableUrl(media.externalUrl) }
        }
        
        if (media.storagePath) {
            const signedUrl = await getS3SignedUrl(media.storagePath)
            return { ...media, url: signedUrl }
        }
        
        return media
    }))

    res.status(200).render('show', {
        ...articlePlain,
        media: mediaWithUrls,
        isOwner
    })
}))

router.post('/', upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'documents', maxCount: 5 }
]), asyncHandler(async(req, res, next) => {
    const payload = {
        title: req.body.title,
        body: sanitizeContent(req.body.body),
        approved: normalizeApproved(req.body.approved),
        visibility: normalizeVisibility(req.body.visibility),
        userId: req.session.user ? req.session.user.id : null
    }

    try {
        const article = await Article.create(payload)
        const videoLinks = Array.isArray(req.body.videoLinks) ? req.body.videoLinks : [req.body.videoLinks]

        await saveMediaRecords(article, req.files || {}, videoLinks)

        if (wantsJson(req)) {
            const articleWithMedia = await Article.findByPk(article.id, {
                include: [{ model: ArticleMedia, as: 'media' }]
            })
            res.status(201).json(articleWithMedia)
            return
        }

        if (payload.visibility === 'private') {
            res.redirect('/articles/mine')
            return
        }

        res.redirect('/articles')
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            error.status = 400
            error.details = error.errors.map((validationError) => validationError.message)
        }

        next(error)
    }
}))

router.put('/:id', upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'documents', maxCount: 5 }
]), asyncHandler(async(req, res, next) => {
    const article = await Article.findByPk(req.params.id, {
        include: [{ model: ArticleMedia, as: 'media' }]
    })

    if (!article) {
        const error = new Error('Article Not Found')
        error.status = 404
        error.details = 'The article you are trying to update does not exist.'
        return next(error)
    }

    try {
        assertOwnership(article, req.session.user.id)
    } catch (error) {
        return next(error)
    }

    const updates = {
        title: req.body.title,
        body: sanitizeContent(req.body.body),
        approved: normalizeApproved(req.body.approved),
        visibility: normalizeVisibility(req.body.visibility)
    }

    // Assign ownership if missing (legacy articles)
    if (!article.userId && req.session.user) {
        updates.userId = req.session.user.id
    }

    const removeMedia = []
    if (req.body.removeMedia) {
        const values = Array.isArray(req.body.removeMedia)
            ? req.body.removeMedia
            : [req.body.removeMedia]

        values.forEach((value) => {
            const parsed = Number(value)
            if (!Number.isNaN(parsed)) {
                removeMedia.push(parsed)
            }
        })
    }

    const videoLinks = Array.isArray(req.body.videoLinks) ? req.body.videoLinks : [req.body.videoLinks]

    try {
        await article.update(updates)
        await deleteMediaRecords(removeMedia, req.session.user.id)
        await ArticleMedia.destroy({
            where: {
                articleId: article.id,
                type: 'video'
            }
        })
        await saveMediaRecords(article, req.files || {}, videoLinks)

        if (wantsJson(req)) {
            const updatedArticle = await Article.findByPk(article.id, {
                include: [{ model: ArticleMedia, as: 'media' }]
            })
            res.status(200).json(updatedArticle)
            return
        }

        const redirectTarget = article.visibility === 'private' ? '/articles/mine' : '/articles'
        res.redirect(redirectTarget)
    } catch (error) {
        if (error.name === 'SequelizeValidationError') {
            error.status = 400
            error.details = error.errors.map((validationError) => validationError.message)
        }

        next(error)
    }
}))

router.delete('/:id', asyncHandler(async(req, res, next) => {
    const article = await Article.findByPk(req.params.id)

    if (!article) {
        const error = new Error('Article Not Found')
        error.status = 404
        error.details = 'The article you are trying to delete does not exist.'
        return next(error)
    }

    try {
        assertOwnership(article, req.session.user.id)
    } catch (error) {
        return next(error)
    }

    await article.destroy()

    if (wantsJson(req)) {
        res.status(204).end()
        return
    }

    const redirectTarget = article.visibility === 'private' ? '/articles/mine' : '/articles'
    res.redirect(redirectTarget)
}))

module.exports = router
