export type CommerceProvider = 'shopify' | 'prestashop' | 'woocommerce' | 'meta' | 'facebook_marketplace' | 'instagram_shops' | 'tiktok_shop' | 'whatsapp' | 'cod' | 'carriers' | 'stripe'

export type CommerceEvent = {
  id: string
  provider: CommerceProvider
  topic: string
  occurredAt: string
  storeId: string
  resourceId?: string
  payload: Record<string, unknown>
}

export type ProviderCapability = {
  provider: CommerceProvider
  label: string
  capabilities: string[]
  webhookTopics: string[]
  analyticsEvents: string[]
}

export const PROVIDER_CAPABILITIES: ProviderCapability[] = [
  { provider: 'shopify', label: 'Shopify', capabilities: ['Products', 'Orders', 'Inventory', 'Customers', 'Fulfillment'], webhookTopics: ['orders/create', 'orders/paid', 'orders/fulfilled', 'orders/cancelled', 'products/update', 'inventory_levels/update'], analyticsEvents: ['product_viewed', 'checkout_started', 'purchase', 'refund'] },
  { provider: 'prestashop', label: 'PrestaShop', capabilities: ['Catalog', 'Orders', 'Customers', 'Stock'], webhookTopics: ['order.created', 'order.updated', 'product.updated', 'stock.updated'], analyticsEvents: ['product_viewed', 'cart_created', 'purchase', 'refund'] },
  { provider: 'meta', label: 'Meta Commerce', capabilities: ['Catalog', 'Instagram Shops', 'Facebook Shops', 'Orders', 'Inventory', 'Messaging'], webhookTopics: ['feed.updated', 'order.created', 'order.updated', 'order.cancelled', 'messages'], analyticsEvents: ['content_view', 'product_viewed', 'purchase', 'message_started'] },
  { provider: 'facebook_marketplace', label: 'Facebook Marketplace', capabilities: ['Catalog', 'Orders', 'Inventory', 'Fulfillment'], webhookTopics: ['listing.updated', 'order.created', 'order.updated', 'order.cancelled'], analyticsEvents: ['listing_viewed', 'product_viewed', 'purchase'] },
  { provider: 'instagram_shops', label: 'Instagram Shops', capabilities: ['Catalog', 'Orders', 'Inventory', 'Conversions'], webhookTopics: ['feed.updated', 'order.created', 'order.updated', 'order.cancelled'], analyticsEvents: ['content_view', 'product_viewed', 'purchase'] },
  { provider: 'tiktok_shop', label: 'TikTok Shop', capabilities: ['Catalog', 'Orders', 'Inventory', 'Fulfillment'], webhookTopics: ['PRODUCT_STATUS_CHANGE', 'ORDER_STATUS_CHANGE', 'INVENTORY_UPDATE'], analyticsEvents: ['product_viewed', 'checkout_started', 'purchase'] },
  { provider: 'stripe', label: 'Stripe', capabilities: ['Payments', 'Refunds', 'Disputes', 'Subscriptions'], webhookTopics: ['checkout.session.completed', 'payment_intent.succeeded', 'charge.refunded', 'charge.dispute.created'], analyticsEvents: ['payment_succeeded', 'refund', 'dispute'] },
]

export function getProviderCapability(provider: CommerceProvider) {
  return PROVIDER_CAPABILITIES.find((item) => item.provider === provider)
}
