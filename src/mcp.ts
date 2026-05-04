import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function textResponse(text: string) {
  return {
    content: [
      {
        type: "text" as const,
        text
      }
    ]
  };
}

export function registerTailwindTools(server: McpServer) {
  server.tool(
    "search_tailwind_docs",
    "Search Tailwind CSS documentation.",
    {
      query: z.string().describe("Search query for Tailwind CSS documentation."),
      category: z.string().optional().describe("Filter by documentation category."),
      limit: z.number().int().positive().optional().describe("Limit number of results.")
    },
    async ({ query, category, limit }) => {
      const parts: string[] = [`Search Tailwind CSS docs for: ${query}.`];

      if (category) {
        parts.push(`Category: ${category}.`);
      }

      if (typeof limit === "number") {
        parts.push(`Limit: ${limit}.`);
      }

      parts.push("Wire this tool to a documentation index to return actual hits.");

      return textResponse(parts.join(" "));
    }
  );
}

export function createTailwindMcpServer() {
  return new McpServer({
    name: "tailwindcss-mcp",
    version: "0.1.0"
  });
}
