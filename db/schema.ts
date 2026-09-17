import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull().default(""),
  category: text("category").notNull().default(""),
  year: integer("year"),
  coverKey: text("cover_key"),
  coverContentType: text("cover_content_type"),
  coverWidth: integer("cover_width"),
  coverHeight: integer("cover_height"),
  externalUrl: text("external_url").notNull().default(""),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("idx_projects_public_order").on(table.status, table.sortOrder, table.updatedAt),
]);

export const inquiries = sqliteTable("inquiries", {
  id: text("id").primaryKey(),
  submissionId: text("submission_id").notNull(),
  name: text("name").notNull(),
  contact: text("contact").notNull(),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  status: text("status", { enum: ["new", "read", "resolved"] }).notNull().default("new"),
  sourceHash: text("source_hash").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_inquiries_submission_id").on(table.submissionId),
  index("idx_inquiries_status_created").on(table.status, table.createdAt),
  index("idx_inquiries_source_created").on(table.sourceHash, table.createdAt),
]);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
