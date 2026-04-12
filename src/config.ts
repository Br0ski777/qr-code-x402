import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "qr-code",
  slug: "qr-code",
  description: "Generate QR codes from text or URLs. Returns base64 PNG image.",
  version: "1.0.0",
  routes: [
    {
      method: "POST",
      path: "/api/qr",
      price: "$0.001",
      description: "Generate a QR code image from text or URL",
      mimeType: "application/json",
      toolName: "utility_generate_qr_code",
      toolDescription: "Use this when you need to generate a QR code from text, a URL, or any string data. Returns a base64-encoded PNG image of the QR code, the dimensions in pixels, and the input data. Do NOT use for taking screenshots of web pages — use capture_screenshot instead. Do NOT use for generating PDFs — use document_generate_pdf instead.",
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
