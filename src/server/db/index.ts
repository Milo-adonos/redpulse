import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as {
  conn: ReturnType<typeof postgres> | undefined;
};

const conn =
  globalForDb.conn ??
  (connectionString
    ? postgres(connectionString, { prepare: false })
    : null);

if (process.env.NODE_ENV !== "production" && conn) {
  globalForDb.conn = conn;
}

export const db = conn ? drizzle(conn, { schema }) : null;

export type Database = NonNullable<typeof db>;
