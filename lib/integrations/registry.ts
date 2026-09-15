import type { CommerceProvider } from '@/lib/commerce/providers'

export type ProviderKind = 'store' | 'messaging' | 'marketing' | 'payments' | 'carrier'
export type ConnectionStatus = 'connected' | 'pending' | 'error' | 'setup_required' | 'disconnected'

export type ProviderDefinition = {
  id: string
  label: string
  kind: ProviderKind
  description: string
  capabilities: string[]
  setup: 'oauth' | 'api_key' | 'storefront_token' | 'webhook'
  regions?: string[]
  accent: string
}

export const PROVIDER_REGISTRY: ProviderDefinition[] = [
  { id: 'shopify', label: 'Shopify', kind: 'store', description: 'Products, orders, inventory, customers', capabilities: ['catalog', 'orders', 'inventory', 'customers'], setup: 'storefront_token', accent: '#95bf47' },
  { id: 'woocommerce', label: 'WooCommerce', kind: 'store', description: 'Products, orders and stock sync', capabilities: ['catalog', 'orders', 'inventory'], setup: 'api_key', accent: '#96588a' },
  { id: 'prestashop', label: 'PrestaShop', kind: 'store', description: 'Catalog, orders, customers and stock', capabilities: ['catalog', 'orders', 'inventory', 'customers'], setup: 'api_key', accent: '#df0067' },
  { id: 'meta', label: 'Meta Commerce', kind: 'marketing', description: 'Facebook Shops, Instagram Shops and conversion events', capabilities: ['catalog', 'orders', 'inventory', 'customers', 'conversions', 'messaging'], setup: 'oauth', accent: '#1877f2' },
  { id: 'facebook_marketplace', label: 'Facebook Marketplace', kind: 'marketing', description: 'Marketplace listings, orders and fulfillment', capabilities: ['catalog', 'orders', 'inventory', 'fulfillment'], setup: 'oauth', accent: '#1877f2' },
  { id: 'instagram_shops', label: 'Instagram Shops', kind: 'marketing', description: 'Shoppable product catalog and orders', capabilities: ['catalog', 'orders', 'inventory', 'conversions'], setup: 'oauth', accent: '#e1306c' },
  { id: 'tiktok_shop', label: 'TikTok Shop', kind: 'marketing', description: 'Products, orders, inventory and fulfillment', capabilities: ['catalog', 'orders', 'inventory', 'fulfillment'], setup: 'oauth', accent: '#111111' },
  { id: 'whatsapp', label: 'WhatsApp Business', kind: 'messaging', description: 'Templates, notifications and automation', capabilities: ['messages', 'templates', 'delivery_events'], setup: 'oauth', accent: '#25d366' },
  { id: 'cod', label: 'COD operations', kind: 'payments', description: 'Confirmations, retries and delivery status', capabilities: ['confirmation', 'delivery_status', 'returns'], setup: 'webhook', regions: ['MA'], accent: '#d08a45' },
  { id: 'stripe', label: 'Stripe', kind: 'payments', description: 'Payments, refunds and disputes', capabilities: ['payments', 'refunds', 'disputes'], setup: 'api_key', accent: '#635bff' },
  { id: 'carriers', label: 'Delivery carriers', kind: 'carrier', description: 'Shipment labels and tracking updates', capabilities: ['shipments', 'tracking', 'delivery_status'], setup: 'api_key', accent: '#4b8068' },
]

export function getProviderDefinition(id: string) {
  return PROVIDER_REGISTRY.find((provider) => provider.id === id)
}

export function normalizeProviderId(value: string) {
  return value.toLowerCase().replace(/\s+/g, '_').replace('commerce', '').replace(/_+$/, '')
}

export type AdapterHealth = { status: ConnectionStatus; checkedAt: string; latencyMs?: number; message?: string }
export type AdapterResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; retryable: boolean }

export type IntegrationAdapter = {
  provider: ProviderDefinition
  testConnection(input: { storeUrl: string; credentials?: Record<string, string> }): Promise<AdapterResult<AdapterHealth>>
  sync?(input: { connectionId: string; cursor?: string }): Promise<AdapterResult<{ cursor?: string; counts: Record<string, number> }>>
  verifyWebhook?(input: { payload: string; signature?: string; secret?: string }): AdapterResult<{ externalId: string; topic: string }>
}

export function backoffDelay(attempt: number, baseMs = 350, maxMs = 6000) {
  return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempt - 1)) + Math.floor(Math.random() * 120)
}

export const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504])

export function isRetryableStatus(status: number) {
  return RETRYABLE_STATUS_CODES.has(status)
}

export type SupportedCommerceProvider = CommerceProvider | 'woocommerce' | 'whatsapp' | 'cod' | 'carriers'
