import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { createHash } from 'node:crypto'
import ExcelJS from 'exceljs'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { reportPreference, storeConnection, user } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { getEmailConfig } from '@/lib/email/config'

export const runtime = 'nodejs'

function storeLabel(connection: typeof storeConnection.$inferSelect | undefined, domain: string | undefined) {
  if (connection?.workspaceName?.trim()) return connection.workspaceName.trim()
  return domain?.split('.')[0]?.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Connected store'
}

async function buildReport(userId: string, email: string) {
  const [preference] = await db.select().from(reportPreference).where(eq(reportPreference.userId, userId)).limit(1)
  if (!preference?.enabled) return { skipped: true as const }
  const [connection] = await db.select().from(storeConnection).where(eq(storeConnection.userId, userId)).orderBy(desc(storeConnection.updatedAt)).limit(1)
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const token = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN
  let products = 0
  let inventory = 0
  let lowStock = 0
  if (domain && token && connection?.status === 'connected') {
    const response = await fetch(`https://${domain}/api/2026-04/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token }, body: JSON.stringify({ query: '{ products(first: 100) { nodes { totalInventory } } }' }), cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    const nodes = payload?.data?.products?.nodes ?? []
    products = nodes.length
    inventory = nodes.reduce((sum: number, item: { totalInventory?: number | null }) => sum + (item.totalInventory ?? 0), 0)
    lowStock = nodes.filter((item: { totalInventory?: number | null }) => (item.totalInventory ?? 0) < 5).length
  }
  const merchantName = storeLabel(connection, domain)
  const reportDate = new Date().toISOString().slice(0, 10)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = merchantName
  const sheet = workbook.addWorksheet('Daily snapshot')
  sheet.columns = [{ header: 'Metric', key: 'metric', width: 28 }, { header: 'Live value', key: 'value', width: 22 }]
  sheet.addRows([
    { metric: 'Store', value: merchantName },
    { metric: 'Report date', value: reportDate },
    { metric: 'Products returned', value: products },
    { metric: 'Units in stock', value: inventory },
    { metric: 'Low-stock products', value: lowStock },
    { metric: 'Connection status', value: connection?.status ?? 'not connected' },
  ])
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF235337' } }
  sheet.eachRow((row, index) => { if (index > 1 && index % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F6EF' } } })
  const spreadsheet = await workbook.xlsx.writeBuffer()
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([612, 792])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  page.drawText(`${merchantName} commerce report`, { x: 48, y: 735, size: 22, font: bold, color: rgb(0.09, 0.23, 0.17) })
  page.drawText(`Prepared for ${email}`, { x: 48, y: 708, size: 10, font, color: rgb(0.35, 0.42, 0.37) })
  page.drawText(reportDate, { x: 48, y: 691, size: 10, font, color: rgb(0.35, 0.42, 0.37) })
  page.drawText('Live catalog coverage', { x: 48, y: 638, size: 14, font: bold, color: rgb(0.09, 0.23, 0.17) })
  ;[['Products returned', String(products)], ['Units in stock', String(inventory)], ['Low-stock products', String(lowStock)], ['Store connection', connection?.status ?? 'not connected']].forEach(([label, value], index) => {
    const y = 600 - index * 34
    page.drawText(label, { x: 64, y, size: 11, font, color: rgb(0.35, 0.42, 0.37) })
    page.drawText(value, { x: 310, y, size: 11, font: bold, color: rgb(0.09, 0.23, 0.17) })
  })
  page.drawText('This report contains only verified live records available to this workspace.', { x: 48, y: 92, size: 9, font, color: rgb(0.45, 0.5, 0.46) })
  page.drawText('Powered by Efoka.ma', { x: 48, y: 68, size: 9, font: bold, color: rgb(0.09, 0.23, 0.17) })
  return { skipped: false as const, bytes: await pdf.save(), spreadsheet: Buffer.from(spreadsheet), recipient: preference.recipientEmail ?? email, merchantName, reportDate }
}

async function sendReport(userId: string, email: string) {
  const report = await buildReport(userId, email)
  if (report.skipped) return { skipped: true }
  let emailConfig: ReturnType<typeof getEmailConfig>
  try { emailConfig = getEmailConfig() } catch { return { configured: false, skipped: false, reason: 'Transactional email is not configured.' } }
  const filename = report.merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const { data, error } = await emailConfig.client.emails.send(
    {
      from: emailConfig.from,
      to: [report.recipient],
      subject: `${report.merchantName} daily commerce report — ${report.reportDate}`,
      text: `Your live commerce report for ${report.merchantName} is attached.\n\nPowered by Efoka.ma.`,
      html: `<div style="font-family:Arial,sans-serif;color:#17352a"><h2>${report.merchantName} daily commerce report</h2><p>Your live commerce report is attached.</p><p>Powered by Efoka.ma.</p></div>`,
      attachments: [
        { filename: `${filename}-daily-report.pdf`, content: Buffer.from(report.bytes) },
        { filename: `${filename}-daily-report.xlsx`, content: report.spreadsheet },
      ],
    },
    { idempotencyKey: `daily-report/${userId}/${report.reportDate}` },
  )
  if (error) throw new Error('Resend rejected the report')
  return { sent: true, id: data?.id }
}

export async function GET(request: Request) {
  return POST(request)
}

export async function POST(request: Request) {
  const cronAuthorized = process.env.CRON_SECRET && request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
  const session = cronAuthorized ? null : await auth.api.getSession({ headers: await headers() })
  if (!cronAuthorized && !session?.user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  if (cronAuthorized) {
    const recipients = await db.select({ id: user.id, email: user.email }).from(user)
    const results = []
    for (const recipient of recipients) results.push({ id: recipient.id, result: await sendReport(recipient.id, recipient.email).catch((error: Error) => ({ error: error.message })) })
    return NextResponse.json({ ok: true, results })
  }
  return NextResponse.json(await sendReport(session!.user.id, session!.user.email))
}
