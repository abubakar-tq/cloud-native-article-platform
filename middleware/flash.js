const setFlash = (req, type, message) => {
    if (!req.session) {
        return
    }

    req.session.flash = { type, message }
}

module.exports = {
    setFlash
}
