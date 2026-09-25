import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import handler from "./api/generate.js";

async function runTests() {
  console.log("--- Running German B1 Prep Web App Test Suite ---");

  // 1. Verify required files exist
  console.log("Checking project files...");
  const files = [
    "public/index.html",
    "public/style.css",
    "public/app.js",
    "api/generate.js",
    "vercel.json",
    "dev-server.js"
  ];
  for (const f of files) {
    const stat = await fs.stat(f);
    assert.ok(stat.isFile(), `File should exist: ${f}`);
  }
  console.log("✓ All required files exist.");

  // 2. Test api/generate.js - Method validation
  console.log("Testing API method validation...");
  let statusCode = 200;
  let headers = {};
  let resData = null;
  const mockRes = () => ({
    setHeader(k, v) { headers[k] = v; },
    status(code) { statusCode = code; return this; },
    json(data) { resData = data; return this; },
    end() {}
  });

  await handler({ method: "GET" }, mockRes());
  assert.equal(statusCode, 405, "GET request should return 405 Method Not Allowed");
  console.log("✓ Method Not Allowed (405) test passed.");

  // 3. Test api/generate.js - Topic parameter validation
  console.log("Testing input validation for missing topic...");
  await handler({ method: "POST", body: { subject: "Grammatik" } }, mockRes());
  assert.equal(statusCode, 400, "Missing topic should return 400 Bad Request");
  assert.ok(resData.error, "Error message should be present");

  await handler({ method: "POST", body: { subject: "Grammatik", topic: "   " } }, mockRes());
  assert.equal(statusCode, 400, "Empty topic string should return 400 Bad Request");
  console.log("✓ Input validation (400) tests passed.");

  // 4. Test api/generate.js - Missing API Key
  console.log("Testing missing GEMINI_API_KEY handling...");
  const oldKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  await handler({ method: "POST", body: { subject: "Grammatik", topic: "Passiv" } }, mockRes());
  assert.equal(statusCode, 500, "Missing API key should return 500 Server Error");
  assert.ok(resData.error.includes("GEMINI_API_KEY"), "Error message should mention GEMINI_API_KEY");
  console.log("✓ Missing API key test passed.");

  // Restore key if existed
  if (oldKey) {
    process.env.GEMINI_API_KEY = oldKey;
  }

  // 5. Test vercel.json structure
  console.log("Testing vercel.json configuration...");
  const vercelRaw = await fs.readFile("vercel.json", "utf8");
  const vercelConfig = JSON.parse(vercelRaw);
  assert.ok(Array.isArray(vercelConfig.rewrites), "vercel.json should contain rewrites");
  const hasApiRewrite = vercelConfig.rewrites.some(r => r.source.includes("api"));
  assert.ok(hasApiRewrite, "vercel.json should have rewrite rule for /api routes");
  console.log("✓ vercel.json structure test passed.");

  // 6. Test HTML and CSS structure
  console.log("Testing HTML and CSS content...");
  const htmlContent = await fs.readFile("public/index.html", "utf8");
  assert.ok(htmlContent.includes("topic-select"), "HTML should have topic selector");
  assert.ok(htmlContent.includes("Konjunktiv II"), "HTML should have Konjunktiv II option");
  assert.ok(htmlContent.includes("study-mode"), "HTML should have study mode selection");
  assert.ok(htmlContent.includes("app.js"), "HTML should reference app.js");
  assert.ok(htmlContent.includes("style.css"), "HTML should reference style.css");

  const cssContent = await fs.readFile("public/style.css", "utf8");
  assert.ok(cssContent.includes(".option-btn.correct"), "CSS should define .correct state");
  assert.ok(cssContent.includes(".option-btn.incorrect"), "CSS should define .incorrect state");
  console.log("✓ HTML and CSS content tests passed.");

  console.log("\n==========================================");
  console.log(" All tests passed successfully! ");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
