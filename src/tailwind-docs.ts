import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "tailwind-docs.sqlite");

export type TailwindDocSearchResult = {
  pageTitle: string;
  path: string;
  category: string;
  heading?: string;
  kind?: string;
  snippet: string;
  code?: string;
  score: number;
};

export type TailwindDocSearchOptions = {
  category?: string;
  limit?: number;
};

type TailwindDocSearchState =
  | {
      ok: true;
      dbPath: string;
      results: TailwindDocSearchResult[];
    }
  | {
      ok: false;
      dbPath: string;
      error: string;
    };

let cachedDb: DatabaseSync | null = null;

export function getTailwindDocsDbPath() {
  return DEFAULT_DB_PATH;
}

function getDb() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!existsSync(DEFAULT_DB_PATH)) {
    return null;
  }

  cachedDb = new DatabaseSync(DEFAULT_DB_PATH, {
    readOnly: true,
    timeout: 5_000
  });

  return cachedDb;
}

function hasTable(db: DatabaseSync, tableName: string) {
  return (
    db
      .prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(tableName) !== undefined
  );
}

function normalizeRows(
  rows: Array<Record<string, unknown>>
): TailwindDocSearchResult[] {
  return rows.map((row) => ({
    pageTitle: String(row.pageTitle ?? row.title ?? ""),
    path: String(row.path ?? row.page_path ?? ""),
    category: String(row.category ?? ""),
    heading: row.heading ? String(row.heading) : undefined,
    kind: row.kind ? String(row.kind) : undefined,
    snippet: String(row.snippet ?? ""),
    code: row.code ? String(row.code) : undefined,
    score: typeof row.score === "number" ? row.score : Number(row.score ?? 0)
  }));
}

function normalizeFtsQuery(query: string) {
  const tokens = query
    .toLowerCase()
    .match(/[a-z0-9_-]+/g)
    ?.filter(Boolean) ?? [];

  if (tokens.length === 0) {
    return query.trim();
  }

  return tokens.map((token) => `${token}*`).join(" AND ");
}

export function searchTailwindDocs(
  query: string,
  options: TailwindDocSearchOptions = {}
): TailwindDocSearchState {
  const dbPath = getTailwindDocsDbPath();
  const db = getDb();

  if (!db) {
    return {
      ok: false,
      dbPath,
      error:
        "Tailwind docs index not found. Run `npm run docs:refresh` locally, then commit `data/tailwind-docs.sqlite` and `data/tailwind-docs.meta.json`."
    };
  }

  const searchQuery = normalizeFtsQuery(query);
  const limit = Math.min(Math.max(options.limit ?? 5, 1), 20);
  const useStructuredIndex = hasTable(db, "docs_sections_fts");

  const rows: TailwindDocSearchResult[] = useStructuredIndex
    ? normalizeRows(
        db
          .prepare(
          [
            "SELECT page_title AS pageTitle, page_path AS path, category, heading, kind,",
            "snippet(docs_sections_fts, 5, '[', ']', '…', 16) AS snippet,",
            "code, bm25(docs_sections_fts) AS score",
            "FROM docs_sections_fts",
            "WHERE docs_sections_fts MATCH ?",
            options.category ? "AND lower(category) = lower(?)" : "",
            "ORDER BY score ASC",
            "LIMIT ?"
          ]
            .filter(Boolean)
            .join(" ")
        )
          .all(...(options.category ? [searchQuery, options.category, limit] : [searchQuery, limit])) as Array<Record<string, unknown>>
      )
    : normalizeRows(
        db
          .prepare(
          [
            "SELECT title AS pageTitle, path, category,",
            "snippet(docs_fts, 3, '[', ']', '…', 16) AS snippet,",
            "bm25(docs_fts) AS score",
            "FROM docs_fts",
            "WHERE docs_fts MATCH ?",
            options.category ? "AND lower(category) = lower(?)" : "",
            "ORDER BY score ASC",
            "LIMIT ?"
          ]
            .filter(Boolean)
            .join(" ")
        )
          .all(...(options.category ? [searchQuery, options.category, limit] : [searchQuery, limit])) as Array<Record<string, unknown>>
      );

  return {
    ok: true,
    dbPath,
    results: rows
  };
}

export function formatTailwindDocsSearch(
  query: string,
  state: TailwindDocSearchState
) {
  if (!state.ok) {
    return [
      `Search Tailwind CSS docs for: ${query}.`,
      state.error,
      `Expected local index at: ${state.dbPath}.`
    ].join(" ");
  }

  if (state.results.length === 0) {
    return `Search Tailwind CSS docs for: ${query}. No local matches found.`;
  }

  const lines = [`Search Tailwind CSS docs for: ${query}.`];

  state.results.forEach((result, index) => {
    const label = result.heading
      ? `${result.pageTitle} / ${result.heading}`
      : result.pageTitle;
    const kindLabel = result.kind ? ` [${result.kind}]` : "";

    lines.push(`${index + 1}. ${label}${kindLabel} (${result.path})`);
    lines.push(`   Category: ${result.category}`);
    lines.push(`   ${result.snippet}`);
    if (result.code) {
      lines.push(`   Code: ${result.code.slice(0, 180)}`);
    }
  });

  return lines.join("\n");
}
