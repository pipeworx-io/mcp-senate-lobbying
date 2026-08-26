# mcp-senate-lobbying

US Senate Lobbying Disclosure (LDA) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_filings` | Search US Senate Lobbying Disclosure Act (LDA) filings — federal lobbying disclosures showing who is lobbying the US government, for which client, on what issues, and for how much. Lobbying FIRMS/registrants report `income` (what the client paid them); IN-HOUSE lobbyists report `expenses` (what they spent on their own lobbying). Provide at least one filter. Keyless. |
| `get_filing` | Get the full detail of a single LDA lobbying filing by its filing UUID — registrant, client, income/expenses, every lobbying activity (issue + description + named lobbyists), foreign entities, and affiliated organizations. Example filing_uuid: "306576ff-0ef4-4269-b5fa-1a2256685950". Keyless. |
| `list_issue_codes` | List the valid general issue area codes used by LDA filings (the values accepted by the `issue` filter on search_filings), e.g. TAX=Taxation, HCR=Health Issues, ENV=Environment. Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "senate-lobbying": {
      "url": "https://gateway.pipeworx.io/senate-lobbying/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/senate-lobbying/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Senate Lobbying data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
