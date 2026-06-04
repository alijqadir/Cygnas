#!/usr/bin/env node
/**
 * Minimal Express wrapper around the Decap OAuth handler so it can run
 * alongside the Hugo site without Netlify.
 */

const path = require("node:path");
const express = require("express");

// Load .env variables when developing locally; noop if file missing.
try {
  require("dotenv").config();
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn("dotenv not loaded (this is fine if using system env vars)");
}

const { handler } = require(path.join(__dirname, "netlify/functions/decap.js"));

const app = express();

// Decap sends and expects plain text; use raw body to keep signature intact.
app.use(
  express.text({
    type: "*/*",
    limit: "5mb",
  }),
);

async function runHandler(req, res) {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  const event = {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query,
    body: req.body || null,
    isBase64Encoded: false,
  };

  try {
    const { statusCode = 200, headers = {}, body = "" } = await handler(event);
    res.status(statusCode);
    Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
    res.send(body);
  } catch (err) {
    console.error("Decap OAuth handler error", err);
    res.status(500).send("Internal server error");
  }
}

app.all(["/api/decap/auth", "/auth"], runHandler);
app.all(["/api/decap/callback", "/callback"], runHandler);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Decap OAuth bridge listening on http://127.0.0.1:${port}`);
});
