import { createMcpHandler } from "mcp-handler";
import { registerTailwindTools } from "../../../src/mcp";

const handler = createMcpHandler(
  (server) => {
    registerTailwindTools(server);
  },
  {},
  {
    basePath: "/api"
  }
);

export const runtime = "nodejs";

export { handler as GET, handler as POST, handler as DELETE };
