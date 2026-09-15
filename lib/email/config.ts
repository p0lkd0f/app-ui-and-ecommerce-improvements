import { Resend } from 'resend'

let cachedConfig: { client: Resend; from: string; appUrl: string } | undefined

export function getEmailConfig() {
  if (cachedConfig) return cachedConfig

  const apiKey = process.env.RESEND_API_KEY ?? process.env.Key
  const from = process.env.AUTH_FROM_EMAIL ?? process.env.REPORT_FROM_EMAIL
  const appUrl = process.env.APP_URL ?? process.env.BETTER_AUTH_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL

  if (!apiKey || !from || !appUrl) {
    throw new Error('Transactional email requires RESEND_API_KEY (or Key), a verified sender, and APP_URL')
  }

  cachedConfig = { client: new Resend(apiKey), from, appUrl: appUrl.replace(/\/$/, '') }
  return cachedConfig
}
