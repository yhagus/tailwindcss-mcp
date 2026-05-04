import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTailwindMcpServer, registerTailwindTools } from "./mcp";

async function main() {
  const server = createTailwindMcpServer();
  registerTailwindTools(server);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.log("✅ tailwindcss-mcp server started successfully");
}

main().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
