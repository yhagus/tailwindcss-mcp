import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import process from "node:process";

type GitTreeEntry = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
  url: string;
};

type GitTreeResponse = {
  tree: GitTreeEntry[];
  truncated: boolean;
};

type DocsBlock = {
  kind: "prose" | "code";
  heading: string;
  content: string;
  code: string;
  searchText: string;
  order: number;
};

const REPO = "tailwindlabs/tailwindcss.com";
const BRANCH = "main";
const DOCS_ROOT = "src/docs";
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "tailwind-docs.sqlite");
const META_PATH = path.join(DATA_DIR, "tailwind-docs.meta.json");
const TREE_URL = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;

function toRoutePath(filePath: string) {
  const relative = filePath
    .replace(new RegExp(`^${DOCS_ROOT}/`), "")
    .replace(/\.mdx$/, "");

  return relative === "index" ? "/docs" : `/docs/${relative}`;
}

function toCategory(filePath: string) {
  const relative = filePath.replace(new RegExp(`^${DOCS_ROOT}/`), "");
  const [topLevel] = relative.split("/");
  return topLevel === "index.mdx" ? "docs" : topLevel.replace(/\.mdx$/, "");
}

function stripDocPrelude(source: string) {
  return source
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/^import\s+[\s\S]*?$/gm, "")
    .replace(/^export\s+[\s\S]*?$/gm, "")
    .trim();
}

function normalizeProseText(source: string) {
  return source
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(source: string, routePath: string) {
  const frontmatterTitle =
    source.match(/^title:\s*["'](.+?)["']\s*$/m)?.[1] ??
    source.match(/^title:\s*(.+?)\s*$/m)?.[1];

  if (frontmatterTitle) {
    return frontmatterTitle.trim();
  }

  const heading = source.match(/^#\s+(.+)$/m)?.[1];
  if (heading) {
    return heading.trim();
  }

  const fallback = routePath.split("/").filter(Boolean).at(-1) ?? "Tailwind docs";
  return fallback
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractBlocks(source: string, pageTitle: string): DocsBlock[] {
  const blocks: DocsBlock[] = [];
  const lines = stripDocPrelude(source).split("\n");
  let currentHeading = pageTitle;
  let inCodeFence = false;
  let proseLines: string[] = [];
  let codeLines: string[] = [];
  let order = 0;

  const flushProse = () => {
    const prose = normalizeProseText(proseLines.join("\n"));
    proseLines = [];

    if (!prose) {
      return;
    }

    blocks.push({
      kind: "prose",
      heading: currentHeading,
      content: prose,
      code: "",
      searchText: [pageTitle, currentHeading, prose].filter(Boolean).join("\n"),
      order: order++
    });
  };

  const flushCode = () => {
    const code = codeLines.join("\n").trim();
    codeLines = [];

    if (!code) {
      return;
    }

    blocks.push({
      kind: "code",
      heading: currentHeading,
      content: code,
      code,
      searchText: [pageTitle, currentHeading, code].filter(Boolean).join("\n"),
      order: order++
    });
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    const fenceMatch = line.match(/^```/);

    if (headingMatch && !inCodeFence) {
      flushProse();
      currentHeading = headingMatch[2].trim();
      continue;
    }

    if (fenceMatch) {
      if (inCodeFence) {
        flushCode();
        inCodeFence = false;
      } else {
        flushProse();
        inCodeFence = true;
      }

      continue;
    }

    if (inCodeFence) {
      codeLines.push(line);
      continue;
    }

    proseLines.push(line);
  }

  if (inCodeFence) {
    flushCode();
  } else {
    flushProse();
  }

  return blocks;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "tailwindcss-mcp"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "tailwindcss-mcp"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

async function main() {
  console.log("Building Tailwind docs index...");

  try {
    const tree = await fetchJson<GitTreeResponse>(TREE_URL);
    if (tree.truncated) {
      throw new Error("Git tree response was truncated; the docs corpus is too large to index reliably.");
    }

    const docsFiles = tree.tree
      .filter((entry) => entry.type === "blob")
      .map((entry) => entry.path)
      .filter((filePath) => filePath.startsWith(`${DOCS_ROOT}/`) && filePath.endsWith(".mdx"))
      .sort((a, b) => a.localeCompare(b));

    if (docsFiles.length === 0) {
      throw new Error("No Tailwind docs files were found in the Git tree.");
    }

    mkdirSync(DATA_DIR, { recursive: true });
    rmSync(DB_PATH, { force: true });

    const db = new DatabaseSync(DB_PATH);
    db.exec(`
      PRAGMA journal_mode = OFF;
      PRAGMA synchronous = OFF;
      PRAGMA temp_store = MEMORY;
      DROP TABLE IF EXISTS docs_sections_fts;
      DROP TABLE IF EXISTS docs_sections_meta;
      CREATE VIRTUAL TABLE docs_sections_fts USING fts5(
        page_title,
        page_path UNINDEXED,
        category,
        heading,
        kind UNINDEXED,
        search_text,
        content UNINDEXED,
        code UNINDEXED,
        tokenize = 'unicode61 remove_diacritics 2'
      );
      CREATE TABLE docs_sections_meta (
        rowid INTEGER PRIMARY KEY AUTOINCREMENT,
        page_title TEXT NOT NULL,
        page_path TEXT NOT NULL,
        category TEXT NOT NULL,
        heading TEXT NOT NULL,
        kind TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );
    `);

    const insert = db.prepare(
      "INSERT INTO docs_sections_fts (page_title, page_path, category, heading, kind, search_text, content, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    const insertMeta = db.prepare(
      "INSERT INTO docs_sections_meta (page_title, page_path, category, heading, kind, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const rows = await mapWithConcurrency(docsFiles, 8, async (filePath) => {
      const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${filePath}`;
      const source = await fetchText(rawUrl);
      const routePath = toRoutePath(filePath);
      const title = extractTitle(source, routePath);
      const category = toCategory(filePath);
      const blocks = extractBlocks(source, title);

      return {
        title,
        routePath,
        category,
        blocks
      };
    });

    db.exec("BEGIN");
    try {
      for (const row of rows) {
        for (const block of row.blocks) {
          insert.run(
            row.title,
            row.routePath,
            row.category,
            block.heading,
            block.kind,
            block.searchText,
            block.content,
            block.code
          );
          insertMeta.run(
            row.title,
            row.routePath,
            row.category,
            block.heading,
            block.kind,
            block.order
          );
        }
      }

      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    const meta = db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)");
    const source = `https://github.com/${REPO}`;
    meta.run("source", source);
    meta.run("branch", BRANCH);
    const generatedAt = new Date().toISOString();
    meta.run("generatedAt", generatedAt);
    meta.run("documentCount", String(rows.length));
    meta.run(
      "blockCount",
      String(rows.reduce((total, row) => total + row.blocks.length, 0))
    );
    meta.run("schemaVersion", "2");

    db.close();

    writeFileSync(
      META_PATH,
      JSON.stringify(
        {
          source,
          branch: BRANCH,
          generatedAt,
          documentCount: rows.length,
          indexPath: path.relative(process.cwd(), DB_PATH)
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    console.log(`Indexed ${rows.length} Tailwind docs pages at ${DB_PATH}`);
  } catch (error) {
    if (existsSync(DB_PATH)) {
      console.warn(`Tailwind docs index refresh failed, keeping cached index at ${DB_PATH}.`);
      console.warn(error);
      return;
    }

    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
