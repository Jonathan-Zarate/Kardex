import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  ruc: varchar('ruc', { length: 20 }).notNull().unique(),
  address: text('address'),
  logoUrl: text('logo_url'),
  currency: varchar('currency', { length: 3 }).notNull().default('PEN'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('America/Lima'),
  decimalSeparator: varchar('decimal_separator', { length: 1 }).notNull().default('.'),
  dateFormat: varchar('date_format', { length: 20 }).notNull().default('DD/MM/YYYY'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
