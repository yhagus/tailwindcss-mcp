import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "tailwindcss-mcp",
  version: "0.1.0"
});

server.tool(
  "suggest_tailwind_classes",
  "Suggest Tailwind CSS utility classes for a UI intent.",
  {
    intent: z.string().describe("Example: primary button, hero section, card layout")
  },
  async ({ intent }) => {
    const suggestions: Record<string, string> = {
      "primary button":
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700",
      card: "rounded-xl border bg-white p-6 shadow-sm",
      "hero section": "mx-auto max-w-5xl px-6 py-24 text-center"
    };

    const key = intent.toLowerCase();

    return {
      content: [
        {
          type: "text",
          text:
            suggestions[key] ??
            `Try composing layout, spacing, typography, color, and state utilities for: ${intent}`
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.log("✅ tailwindcss-mcp server started successfully");
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});