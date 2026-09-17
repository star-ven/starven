import { asc, desc, eq } from "drizzle-orm";

import { getDb, type StarVenDatabase } from "./index";
import { projects, type NewProject, type Project } from "./schema";

export type ProjectCreateInput = Omit<NewProject, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectUpdateInput = Partial<Pick<Project,
  | "title"
  | "summary"
  | "category"
  | "year"
  | "coverKey"
  | "coverContentType"
  | "coverWidth"
  | "coverHeight"
  | "externalUrl"
  | "status"
  | "sortOrder"
>> & { updatedAt?: string };

function projectUpdates(input: ProjectUpdateInput): ProjectUpdateInput {
  const updates: ProjectUpdateInput = {};
  const fields = [
    "title",
    "summary",
    "category",
    "year",
    "coverKey",
    "coverContentType",
    "coverWidth",
    "coverHeight",
    "externalUrl",
    "status",
    "sortOrder",
  ] as const;

  for (const field of fields) {
    if (Object.hasOwn(input, field)) {
      Object.assign(updates, { [field]: input[field] });
    }
  }
  updates.updatedAt = input.updatedAt ?? new Date().toISOString();
  return updates;
}

export async function listPublishedProjects(database: StarVenDatabase = getDb()) {
  return database
    .select()
    .from(projects)
    .where(eq(projects.status, "published"))
    .orderBy(asc(projects.sortOrder), desc(projects.updatedAt), asc(projects.id))
    .prepare()
    .all();
}

export async function listAllProjects(database: StarVenDatabase = getDb()) {
  return database
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder), desc(projects.updatedAt), asc(projects.id))
    .prepare()
    .all();
}

export async function createProject(input: ProjectCreateInput, database: StarVenDatabase = getDb()) {
  const now = new Date().toISOString();
  const value: NewProject = {
    ...input,
    id: input.id ?? crypto.randomUUID(),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };

  const created = await database.insert(projects).values(value).returning().prepare().get();
  if (!created) throw new Error("Project insert returned no row.");
  return created;
}

export async function updateProject(
  id: string,
  input: ProjectUpdateInput,
  database: StarVenDatabase = getDb(),
) {
  return (await database
    .update(projects)
    .set(projectUpdates(input))
    .where(eq(projects.id, id))
    .returning()
    .prepare()
    .get()) ?? null;
}

export async function deleteProject(id: string, database: StarVenDatabase = getDb()) {
  return (await database
    .delete(projects)
    .where(eq(projects.id, id))
    .returning()
    .prepare()
    .get()) ?? null;
}
