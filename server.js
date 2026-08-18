const http = require('http')
const { loadSecretsFromAWS } = require('./utils/secrets')

const PORT = process.env.PORT || 3000

async function start() {
    try {
        // Fetch secrets first so env vars are populated before Sequelize loads config
        await loadSecretsFromAWS()

        // Require app and models after secrets are loaded
        const app = require('./app')
        const { sequelize } = require('./models')

        await sequelize.authenticate()
        // Ensure tables exist in environments where migrations aren't run (e.g., Railway/K8s startup)
        await sequelize.sync()

        const server = http.createServer(app)

        server.on('error', (error) => {
            console.error('Server failed to start:', error.message)
            process.exit(1)
        })

        server.listen(PORT, () => {
            console.log(`Server listening on http://localhost:${PORT}`)
        })
    } catch (err) {
        console.error('Startup failed:', err.message)
        process.exit(1)
    }
}

start()
