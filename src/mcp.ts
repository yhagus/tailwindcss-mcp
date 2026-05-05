import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatTailwindDocsSearch, searchTailwindDocs } from "./tailwind-docs";

type ToolArgs = Record<string, unknown>;

type TailwindTool = {
  name:
    | "get_tailwind_utilities"
    | "get_tailwind_colors"
    | "get_tailwind_config_guide"
    | "search_tailwind_docs"
    | "install_tailwind"
    | "convert_css_to_tailwind"
    | "generate_color_palette"
    | "generate_component_template";
  description: string;
  fields: string[];
  inputSchema: Record<string, unknown>;
  handler: (args: ToolArgs) => Promise<{ content: Array<{ type: "text"; text: string }> }>;
};

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

function jsonResponse(data: unknown) {
  return textResponse(JSON.stringify(data, null, 2));
}

function normalizeArgs(args: unknown): ToolArgs {
  if (!args || typeof args !== "object") {
    return {};
  }

  return args as ToolArgs;
}

function buildStructuredPlaceholder(tool: string, args: ToolArgs, note: string) {
  return jsonResponse({
    tool,
    note,
    received: args
  });
}

export const tailwindTools: TailwindTool[] = [
  {
    name: "get_tailwind_utilities",
    description: "Get TailwindCSS utilities by category, property, or search term.",
    fields: ["category", "property", "search"],
    inputSchema: {
      category: z.string().optional().describe("Filter by utility category."),
      property: z.string().optional().describe("Filter by CSS property."),
      search: z.string().optional().describe("Search term to find utilities.")
    },
    handler: async (args) =>
      buildStructuredPlaceholder(
        "get_tailwind_utilities",
        args,
        "Utility lookup is registered, but this repository does not yet ship a utility catalog."
      )
  },
  {
    name: "get_tailwind_colors",
    description: "Get TailwindCSS color palette information.",
    fields: ["colorName", "includeShades"],
    inputSchema: {
      colorName: z.string().optional().describe("Specific color name."),
      includeShades: z.boolean().optional().describe("Include all color shades.")
    },
    handler: async (args) =>
      buildStructuredPlaceholder(
        "get_tailwind_colors",
        args,
        "Color lookup is registered, but this repository does not yet ship a color palette catalog."
      )
  },
  {
    name: "get_tailwind_config_guide",
    description: "Get TailwindCSS configuration guides for different frameworks.",
    fields: ["topic", "framework"],
    inputSchema: {
      topic: z.string().optional().describe("Configuration topic."),
      framework: z.string().optional().describe("Target framework.")
    },
    handler: async (args) =>
      buildStructuredPlaceholder(
        "get_tailwind_config_guide",
        args,
        "Configuration guidance is registered, but this repository does not yet ship framework-specific guide content."
      )
  },
  {
    name: "search_tailwind_docs",
    description: "Search TailwindCSS documentation.",
    fields: ["query", "category", "limit"],
    inputSchema: {
      query: z.string().describe("Search query for TailwindCSS documentation."),
      category: z.string().optional().describe("Filter by documentation category."),
      limit: z.number().int().positive().optional().describe("Limit number of results.")
    },
    handler: async (args) => {
      const query = typeof args.query === "string" ? args.query : "";
      const category = typeof args.category === "string" ? args.category : undefined;
      const limit = typeof args.limit === "number" ? args.limit : undefined;
      const state = searchTailwindDocs(query, { category, limit });

      return textResponse(formatTailwindDocsSearch(query, state));
    }
  },
  {
    name: "install_tailwind",
    description: "Generate installation commands and configuration files for TailwindCSS in different frameworks.",
    fields: ["framework", "packageManager", "includeTypescript"],
    inputSchema: {
      framework: z.string().describe("Target framework."),
      packageManager: z.enum(["npm", "yarn", "pnpm", "bun"]).optional().describe("Package manager."),
      includeTypescript: z.boolean().optional().describe("Include TypeScript configuration.")
    },
    handler: async (args) =>
      buildStructuredPlaceholder(
        "install_tailwind",
        args,
        "Installation guidance is registered, but this repository does not yet ship framework-specific install output."
      )
  },
  {
    name: "convert_css_to_tailwind",
    description: "Convert traditional CSS to TailwindCSS utility classes.",
    fields: ["css", "mode"],
    inputSchema: {
      css: z.string().describe("CSS code to convert to TailwindCSS utilities."),
      mode: z.enum(["inline", "classes", "component"]).optional().describe("Output format.")
    },
    handler: async (args) =>
      buildStructuredPlaceholder(
        "convert_css_to_tailwind",
        args,
        "CSS conversion is registered, but this repository does not yet ship a conversion engine."
      )
  },
  {
    name: "generate_color_palette",
    description: "Generate a custom color palette with multiple shades from a base color.",
    fields: ["baseColor", "name", "shades"],
    inputSchema: {
      baseColor: z.string().describe("Base color in hex, rgb, or hsl format."),
      name: z.string().describe("Name for the color palette."),
      shades: z.array(z.number()).optional().describe("Shade values to generate.")
    },
    handler: async (args) =>
      buildStructuredPlaceholder(
        "generate_color_palette",
        args,
        "Palette generation is registered, but this repository does not yet ship a palette generator."
      )
  },
  {
    name: "generate_component_template",
    description: "Generate HTML component templates with TailwindCSS classes.",
    fields: ["componentType", "style", "darkMode", "responsive"],
    inputSchema: {
      componentType: z.string().describe("Type of component to generate."),
      style: z.enum(["minimal", "modern", "playful"]).optional().describe("Visual style."),
      darkMode: z.boolean().optional().describe("Include dark mode support."),
      responsive: z.boolean().optional().describe("Include responsive design classes.")
    },
    handler: async (args) =>
      buildStructuredPlaceholder(
        "generate_component_template",
        args,
        "Component template generation is registered, but this repository does not yet ship a template generator."
      )
  }
];

export function registerTailwindTools(server: McpServer) {
  for (const tool of tailwindTools) {
    server.tool(tool.name, tool.description, tool.inputSchema, async (args) =>
      tool.handler(normalizeArgs(args))
    );
  }
}

export function createTailwindMcpServer() {
  return new McpServer({
    name: "tailwindcss-mcp",
    version: "0.1.0"
  });
}
