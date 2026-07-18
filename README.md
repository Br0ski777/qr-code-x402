# QR Code Generator API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://qr-code.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Generate QR codes from text or URLs -- base64 PNG output, configurable size. Fast and lightweight. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "qr-code": {
      "url": "https://qr-code.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl -X POST "https://qr-code.api.klymax402.com/api/qr" \
  -H "Content-Type: application/json" \
  -d '{"data":"..."}'
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `utility_generate_qr_code` | POST | `/api/qr` | $0.003 | Generate a QR code image from text or URL |

### `utility_generate_qr_code`

Use this when you need to generate a QR code from text, a URL, or any string data. Returns base64 image data in JSON.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `data` | string | yes | The text or URL to encode in the QR code |
| `size` | number | no | QR code size in modules (default: 21 for version 1) |

Example response:

```json
{"data":"https://example.com","image":"iVBORw0KGgo...","width":210,"height":210,"format":"png"}
```

**When to use**: generating shareable links, payment QR codes, Wi-Fi connection codes, vCard contact sharing, and event ticket barcodes.

**Not for**: screenshots (use `capture_screenshot`), PDFs (use `document_generate_pdf`).

## Example agent prompts

- "Generate a QR code from text, a URL, or any string data"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
