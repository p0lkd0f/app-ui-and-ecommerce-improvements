const requiredAtRuntime = ['DATABASE_URL', 'BETTER_AUTH_SECRET'] as const

export function assertServerEnvironment() {
  const missing = requiredAtRuntime.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required server environment variables: ${missing.join(', ')}`)
  }
}

export function getPublicAppUrl() {
  const value = process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? 'http://localhost:3000'
  return value.startsWith('http') ? value.replace(/\/$/, '') : `https://${value}`
}
