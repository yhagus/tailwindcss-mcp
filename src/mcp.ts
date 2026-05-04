import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatTailwindDocsSearch, searchTailwindDocs } from "./tailwind-docs.ts";

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
    "get_tailwind_utilities",
    "Get Tailwind CSS utilities by category, property, or search term.",
    {
      category: z.string().optional().describe("Filter by utility category such as layout, typography, or colors."),
      property: z.string().optional().describe("Filter by CSS property such as margin, color, or font-size."),
      search: z.string().optional().describe("Search term to find matching utilities.")
    },
    async ({ category, property, search }) => {
      const parts: string[] = ["Tailwind CSS utilities lookup."];

      if (category) {
        parts.push(`Category: ${category}.`);
      }

      if (property) {
        parts.push(`Property: ${property}.`);
      }

      if (search) {
        parts.push(`Search: ${search}.`);
      }

      parts.push("This server currently exposes the tool registry; connect a Tailwind data source to return a full utility database.");

      return textResponse(parts.join(" "));
    }
  );

  server.tool(
    "get_tailwind_colors",
    "Get Tailwind CSS color palette information.",
    {
      colorName: z.string().optional().describe("Specific color name such as blue, slate, or red."),
      includeShades: z.boolean().optional().describe("Include all color shades.")
    },
    async ({ colorName, includeShades }) => {
      const parts: string[] = ["Tailwind CSS color palette lookup."];

      if (colorName) {
        parts.push(`Color: ${colorName}.`);
      }

      if (typeof includeShades === "boolean") {
        parts.push(`Include shades: ${includeShades ? "yes" : "no"}.`);
      }

      parts.push("A full palette backend is not wired in yet.");

      return textResponse(parts.join(" "));
    }
  );

  server.tool(
    "get_tailwind_config_guide",
    "Get Tailwind CSS configuration guides for different frameworks.",
    {
      topic: z.string().optional().describe("Configuration topic such as installation, customization, or content."),
      framework: z.string().optional().describe("Target framework such as react, vue, nextjs, or vite.")
    },
    async ({ topic, framework }) => {
      const parts: string[] = ["Tailwind CSS configuration guide."];

      if (topic) {
        parts.push(`Topic: ${topic}.`);
      }

      if (framework) {
        parts.push(`Framework: ${framework}.`);
      }

      parts.push("Use the Tailwind documentation and framework-specific setup guides for implementation details.");

      return textResponse(parts.join(" "));
    }
  );

  server.tool(
    "search_tailwind_docs",
    "Search Tailwind CSS documentation.",
    {
      query: z.string().describe("Search query for Tailwind CSS documentation."),
      category: z.string().optional().describe("Filter by documentation category."),
      limit: z.number().int().positive().optional().describe("Limit number of results.")
    },
    async ({ query, category, limit }) => {
      const state = searchTailwindDocs(query, { category, limit });
      return textResponse(formatTailwindDocsSearch(query, state));
    }
  );

  server.tool(
    "install_tailwind",
    "Generate installation commands and configuration files for Tailwind CSS in different frameworks.",
    {
      framework: z.string().describe("Target framework such as react, nextjs, vue, vite, laravel, angular, or svelte."),
      packageManager: z.enum(["npm", "yarn", "pnpm", "bun"] as const).optional().describe("Package manager to use."),
      includeTypescript: z.boolean().optional().describe("Include TypeScript configuration.")
    },
    async ({ framework, packageManager, includeTypescript }) => {
      const manager = packageManager ?? "npm";
      const parts: string[] = [`Install Tailwind CSS for ${framework} using ${manager}.`];

      if (includeTypescript) {
        parts.push("Include TypeScript configuration.");
      }

      parts.push("This implementation currently returns guidance text rather than generated shell commands.");

      return textResponse(parts.join(" "));
    }
  );

  server.tool(
    "convert_css_to_tailwind",
    "Convert traditional CSS to Tailwind CSS utility classes.",
    {
      css: z.string().describe("CSS code to convert to Tailwind utilities."),
      mode: z.enum(["inline", "classes", "component"] as const).optional().describe("Output mode.")
    },
    async ({ css, mode }) => {
      const preview = css.replace(/\s+/g, " ").trim().slice(0, 120);
      const outputMode = mode ?? "classes";

      return textResponse(
        `Convert CSS to Tailwind in ${outputMode} mode. Input preview: ${preview || "[empty]"}.`
      );
    }
  );

  server.tool(
    "generate_color_palette",
    "Generate a custom color palette with multiple shades from a base color.",
    {
      baseColor: z.string().describe("Base color in hex, rgb, or hsl format."),
      name: z.string().describe("Name for the color palette."),
      shades: z.array(z.number()).optional().describe("Shade values to generate.")
    },
    async ({ baseColor, name, shades }) => {
      const shadeList = shades?.length ? shades.join(", ") : "50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950";

      return textResponse(
        `Generate a ${name} color palette from ${baseColor} with shades: ${shadeList}.`
      );
    }
  );

  server.tool(
    "generate_component_template",
    "Generate HTML component templates with Tailwind CSS classes.",
    {
      componentType: z.string().describe("Type of component to generate."),
      style: z.enum(["minimal", "modern", "playful"] as const).optional().describe("Visual style of the component."),
      darkMode: z.boolean().optional().describe("Include dark mode support."),
      responsive: z.boolean().optional().describe("Include responsive design classes.")
    },
    async ({ componentType, style, darkMode, responsive }) => {
      const parts: string[] = [`Generate a ${componentType} component template.`];

      if (style) {
        parts.push(`Style: ${style}.`);
      }

      if (typeof darkMode === "boolean") {
        parts.push(`Dark mode: ${darkMode ? "enabled" : "disabled"}.`);
      }

      if (typeof responsive === "boolean") {
        parts.push(`Responsive: ${responsive ? "enabled" : "disabled"}.`);
      }

      parts.push("Connect this to a template generator to return HTML output.");

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
