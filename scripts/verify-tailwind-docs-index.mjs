import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "tailwind-docs.sqlite");
const metaPath = path.join(dataDir, "tailwind-docs.meta.json");

if (!existsSync(dbPath) || !existsSync(metaPath)) {
  process.stderr.write(
    [
      "Tailwind docs index snapshot is missing.",
      "Run `npm run docs:refresh` locally, then commit:",
      `- ${path.relative(process.cwd(), dbPath)}`,
      `- ${path.relative(process.cwd(), metaPath)}`
    ].join("\n") + "\n"
  );

  process.exit(1);
}

process.stdout.write("Tailwind docs index snapshot is present.\n");
