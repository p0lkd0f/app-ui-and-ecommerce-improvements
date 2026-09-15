import { boolean, integer, jsonb, text, timestamp, pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull().default(false),
  image: text('image'),
  phone: text('phone'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const session = pgTable('session', {

  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
}, (table) => [index('session_user_expires_idx').on(table.userId, table.expiresAt)])

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export const storeConnection = pgTable('store_connection', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  provider: text('provider').notNull(),
  workspaceName: text('workspaceName').notNull(),
  storeUrl: text('storeUrl').notNull(),
  status: text('status').notNull().default('pending'),
  secretRef: text('secretRef'),
  syncCursor: text('syncCursor'),
  lastSyncedAt: timestamp('lastSyncedAt'),
  lastError: text('lastError'),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
}, (table) => [index('store_connection_user_updated_idx').on(table.userId, table.updatedAt), uniqueIndex('store_connection_user_provider_url_idx').on(table.userId, table.provider, table.storeUrl)])

export type StoreConnection = typeof storeConnection.$inferSelect

export const reportPreference = pgTable('report_preference', {
  userId: text('userId').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  recipientEmail: text('recipientEmail'),
  recipientPhone: text('recipientPhone'),
  senderName: text('senderName'),
  senderEmail: text('senderEmail'),
  timezone: text('timezone').notNull().default('UTC'),
  sendHour: text('sendHour').notNull().default('08:00'),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
})

export type ReportPreference = typeof reportPreference.$inferSelect

export const webhookEvent = pgTable('webhook_event', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  externalId: text('externalId').notNull(),
  payload: jsonb('payload').notNull(),
  status: text('status').notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('lastError'),
  receivedAt: timestamp('receivedAt').notNull().defaultNow(),
  processedAt: timestamp('processedAt'),
}, (table) => [uniqueIndex('webhook_event_provider_external_idx').on(table.provider, table.externalId)])

export type WebhookEvent = typeof webhookEvent.$inferSelect
