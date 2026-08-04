# mcp-senate-lobbying

US Senate Lobbying Disclosure (LDA) MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Senate Lobbying data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
