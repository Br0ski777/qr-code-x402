import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "qr-code",
  slug: "qr-code",
  description: "Generate QR codes from text or URLs -- base64 PNG output, configurable size. Fast and lightweight.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/qr",
      price: "$0.001",
      description: "Generate a QR code image from text or URL",
      mimeType: "application/json",
      toolName: "utility_generate_qr_code",
      toolDescription: `Use this when you need to generate a QR code from text, a URL, or any string data. Returns base64 image data in JSON.

Returns: 1. image (base64-encoded PNG) 2. width and height in pixels 3. data (the encoded input string) 4. format (png).

Example output: {"data":"https://example.com","image":"iVBORw0KGgo...","width":210,"height":210,"format":"png"}

Use this FOR generating shareable links, payment QR codes, Wi-Fi connection codes, vCard contact sharing, and event ticket barcodes.

Do NOT use for barcodes (EAN-13, UPC-A, Code128) -- use utility_generate_barcode instead. Do NOT use for screenshots -- use capture_screenshot instead. Do NOT use for PDFs -- use document_generate_pdf instead.`,
      inputSchema: {
        type: "object",
        properties: {
          data: { type: "string", description: "The text or URL to encode in the QR code" },
          size: { type: "number", description: "QR code size in modules (default: 21 for version 1)" },
        },
        required: ["data"],
      },
    },
  ],
};
