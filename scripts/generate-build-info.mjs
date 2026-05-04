import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, "../src/build-info.ts");
const builtAt = new Date().toISOString();

const content = `export const buildTimestamp = ${JSON.stringify(builtAt)} as const;
`;

await writeFile(outputPath, content, "utf8");
