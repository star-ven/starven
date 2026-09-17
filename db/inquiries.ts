import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";

import { getDb, type StarVenDatabase } from "./index";
import { inquiries, type Inquiry, type NewInquiry } from "./schema";

export type InquiryStatus = Inquiry["status"];
export type InquiryCreateInput = Omit<NewInquiry, "id" | "status" | "createdAt" | "updatedAt"> & {
  id?: string;
  status?: InquiryStatus;
  createdAt?: string;
  updatedAt?: string;
};

export async function createInquiryOnce(
  input: InquiryCreateInput,
  database: StarVenDatabase = getDb(),
) {
  const now = new Date().toISOString();
  const value: NewInquiry = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    status: input.status ?? "new",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
  const inserted = await database
    .insert(inquiries)
    .values(value)
    .onConflictDoNothing({ target: inquiries.submissionId })
    .returning()
    .prepare()
    .get();

  if (inserted) return { created: true, inquiry: inserted } as const;

  const existing = await database
    .select()
    .from(inquiries)
    .where(eq(inquiries.submissionId, value.submissionId))
    .prepare()
    .get();
  if (!existing) throw new Error("Inquiry conflict returned no existing row.");
  return { created: false, inquiry: existing } as const;
}

export async function createInquiryWithinRateLimit(
  input: InquiryCreateInput,
  since: string,
  database: StarVenDatabase = getDb(),
) {
  const now = new Date().toISOString();
  const value: NewInquiry = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    status: input.status ?? "new",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  await database.run(sql`
    INSERT INTO "inquiries" (
      "id", "submission_id", "name", "contact", "topic", "message",
      "status", "source_hash", "created_at", "updated_at"
    )
    SELECT
      ${value.id}, ${value.submissionId}, ${value.name}, ${value.contact},
      ${value.topic}, ${value.message}, ${value.status}, ${value.sourceHash},
      ${value.createdAt}, ${value.updatedAt}
    WHERE (
      SELECT count(*)
      FROM "inquiries"
      WHERE "source_hash" = ${value.sourceHash}
        AND "created_at" >= ${since}
    ) < ${3}
    ON CONFLICT ("submission_id") DO NOTHING
  `);

  return (await database
    .select()
    .from(inquiries)
    .where(eq(inquiries.submissionId, value.submissionId))
    .prepare()
    .get()) ?? null;
}

export async function countRecentInquiries(
  sourceHash: string,
  since: string,
  database: StarVenDatabase = getDb(),
  excludeSubmissionId?: string,
) {
  const filters = [
    eq(inquiries.sourceHash, sourceHash),
    gte(inquiries.createdAt, since),
  ];
  if (excludeSubmissionId) {
    filters.push(ne(inquiries.submissionId, excludeSubmissionId));
  }

  const row = await database
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(inquiries)
    .where(and(...filters))
    .prepare()
    .get();
  return row?.count ?? 0;
}

export async function listInquiries(
  status?: InquiryStatus,
  database: StarVenDatabase = getDb(),
) {
  const query = database
    .select()
    .from(inquiries)
    .orderBy(desc(inquiries.createdAt), asc(inquiries.id));

  if (status === undefined) return query.prepare().all();
  return query.where(eq(inquiries.status, status)).prepare().all();
}

export async function updateInquiryStatus(
  id: string,
  status: InquiryStatus,
  database: StarVenDatabase = getDb(),
) {
  return (await database
    .update(inquiries)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(inquiries.id, id))
    .returning()
    .prepare()
    .get()) ?? null;
}

export async function deleteInquiry(id: string, database: StarVenDatabase = getDb()) {
  return (await database
    .delete(inquiries)
    .where(eq(inquiries.id, id))
    .returning()
    .prepare()
    .get()) ?? null;
}
