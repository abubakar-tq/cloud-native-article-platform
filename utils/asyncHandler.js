/**
 * Async handler wrapper to catch errors and pass them to Express error handler
 * @param {Function} fn - The async function to wrap
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
