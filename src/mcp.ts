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

export const tailwindTools = [
  {
    name: "search_tailwind_docs",
    description: "Search Tailwind CSS documentation.",
    fields: ["query", "category", "limit"],
    inputSchema: {
      query: z.string().describe("Search query for Tailwind CSS documentation."),
      category: z.string().optional().describe("Filter by documentation category."),
      limit: z.number().int().positive().optional().describe("Limit number of results.")
    }
  }
] as const;

export function registerTailwindTools(server: McpServer) {
  for (const tool of tailwindTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema,
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
}

export function createTailwindMcpServer() {
  return new McpServer({
    name: "tailwindcss-mcp",
    version: "0.1.0"
  });
}
