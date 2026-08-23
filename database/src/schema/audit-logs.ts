import { foreignKey, index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { companies } from './companies.js'
import { users } from './users.js'

// Tabla inmutable: sin updatedAt, DELETE no permitido (RNF-09)
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: varchar('action', { length: 50 }).notNull(),
  entity: varchar('entity', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ip: varchar('ip', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  companyIdx: index('idx_audit_company_id').on(table.companyId),
  companyCreatedAtIdx: index('idx_audit_company_created_at').on(table.companyId, table.createdAt),
  userCompanyFk: foreignKey({
    columns: [table.userId, table.companyId],
    foreignColumns: [users.id, users.companyId],
    name: 'fk_audit_user_company',
  }),
}))
