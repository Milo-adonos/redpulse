import { readFileSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";

function loadEnvLocal() {
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL manquant (.env.local)");
    process.exit(1);
  }

  const migrationPath = resolve(process.cwd(), "drizzle/0003_product_spec.sql");
  const migration = readFileSync(migrationPath, "utf-8");
  const sql = postgres(url, { max: 1 });

  try {
    await sql.unsafe(migration);
    console.log("Migration 0003 appliquée avec succès.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
