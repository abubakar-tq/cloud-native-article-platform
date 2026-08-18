const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')

let cached = null

async function loadSecretsFromAWS() {
  // Skip if no secret id configured
  const secretId = process.env.AWS_SECRETS_MANAGER_ID || process.env.AWS_SECRET_ID || process.env.DB_SECRET_ID
  if (!secretId) return

  // Skip if already loaded in this process
  if (cached) return cached

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
  const client = new SecretsManagerClient({ region })

  const command = new GetSecretValueCommand({ SecretId: secretId, VersionStage: 'AWSCURRENT' })
  const response = await client.send(command)

  const secretString = response.SecretString || '{}'
  let secretJson = {}
  try {
    secretJson = JSON.parse(secretString)
  } catch (err) {
    console.warn('Secrets Manager value is not JSON; using raw string')
    secretJson = {}
  }

  // Overlay environment variables with secrets (without clearing existing ones)
  const setIfPresent = (key, value) => {
    if (value !== undefined && value !== null && value !== '') {
      process.env[key] = String(value)
    }
  }

  setIfPresent('DB_USERNAME', secretJson.username || secretJson.DB_USERNAME)
  setIfPresent('DB_PASSWORD', secretJson.password || secretJson.DB_PASSWORD)
  setIfPresent('DB_NAME', secretJson.dbname || secretJson.DB_NAME)
  setIfPresent('DB_HOST', secretJson.host || secretJson.DB_HOST)
  setIfPresent('DB_PORT', secretJson.port || secretJson.DB_PORT)
  setIfPresent('DATABASE_URL', secretJson.DATABASE_URL || secretString)
  setIfPresent('RESEND_API_KEY', secretJson.RESEND_API_KEY)
  setIfPresent('SESSION_SECRET', secretJson.SESSION_SECRET)

  cached = secretJson
  return cached
}

module.exports = { loadSecretsFromAWS }
