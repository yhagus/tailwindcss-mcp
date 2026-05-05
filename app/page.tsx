import { buildTimestamp } from "../src/build-info";
import { tailwindTools } from "../src/mcp";

export default function HomePage() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "3rem",
        lineHeight: 1.6,
        maxWidth: "72rem",
        margin: "0 auto"
      }}
    >
      <h1>tailwindcss-mcp</h1>
      <p>MCP endpoint: <code>/api/mcp</code></p>
      <p>Built at: <code>{buildTimestamp}</code></p>
      <p>Available tools:</p>
      <ul style={{ paddingLeft: "1.25rem" }}>
        {tailwindTools.map((tool) => (
          <li key={tool.name} style={{ marginBottom: "1rem" }}>
            <strong>{tool.name}</strong>
            <div>{tool.description}</div>
            <div>Inputs: {tool.fields.join(", ")}</div>
          </li>
        ))}
      </ul>
      <p>Use this project as a remote MCP server on Vercel.</p>
    </main>
  );
}
