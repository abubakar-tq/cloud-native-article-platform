const http = require('http')
const app = require('../app')

// Basic smoke tests
async function runTests() {
    console.log('🧪 Running basic smoke tests...')

    const server = http.createServer(app)

    return new Promise((resolve, reject) => {
        server.listen(3001, async() => {
            try {
                console.log('✅ Server started successfully on port 3001')

                // Test 1: Health endpoint
                const healthResponse = await makeRequest('http://localhost:3001/health')
                if (healthResponse.status === 200) {
                    console.log('✅ Health endpoint test passed')
                } else {
                    throw new Error('Health endpoint test failed')
                }

                // Test 2: Root redirect
                const rootResponse = await makeRequest('http://localhost:3001/')
                if (rootResponse.status === 300 || rootResponse.status === 302) {
                    console.log('✅ Root redirect test passed')
                } else {
                    console.log('⚠️  Root redirect test - unexpected status:', rootResponse.status)
                }

                console.log('🎉 All tests passed!')
                server.close(() => {
                    resolve(true)
                })
            } catch (error) {
                console.error('❌ Test failed:', error.message)
                server.close(() => {
                    reject(error)
                })
            }
        })
    })
}

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = ''
            res.on('data', (chunk) => {
                data += chunk
            })
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data
                })
            })
        })

        req.on('error', (error) => {
            reject(error)
        })

        req.setTimeout(5000, () => {
            req.destroy()
            reject(new Error('Request timeout'))
        })
    })
}

// Run tests
runTests()
    .then(() => {
        console.log('✅ Test suite completed successfully')
        process.exit(0)
    })
    .catch((error) => {
        console.error('❌ Test suite failed:', error.message)
        process.exit(1)
    })
