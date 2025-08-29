#!/usr/bin/env node

/**
 * Render Deployment Helper Script
 * This script helps prepare and guide deployment to Render
 */

const fs = require("fs");

console.log("🚀 Render Deployment Helper");
console.log("==========================\n");

// Check if all required files exist
const requiredFiles = ["package.json", "server.js"];
const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.log("❌ Missing required files:", missingFiles.join(", "));
  process.exit(1);
}

console.log("✅ All required files present");

// Read package.json to get project info
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
console.log(`✅ Project: ${packageJson.name}`);
console.log(`✅ Version: ${packageJson.version}`);

// Check if .env exists (without reading contents)
if (fs.existsSync(".env")) {
  console.log("✅ .env file found");
} else {
  console.log(
    "⚠️  .env file not found - you'll need to set environment variables on Render"
  );
}

console.log("\n🎯 DEPLOYMENT INSTRUCTIONS:");
console.log("============================");
console.log("1. Go to: https://dashboard.render.com/");
console.log('2. Click "New +" → "Web Service"');
console.log("3. Connect GitHub repo: gokkull-15/satoshiscript-ai");
console.log("4. Configure service:");
console.log("   Name: solidity-clarity-converter");
console.log("   Build Command: npm install");
console.log("   Start Command: npm start");
console.log("5. Add environment variables in Render dashboard:");
console.log("   GROQ_API_KEY = [your-groq-api-key]");
console.log("   NODE_ENV = production");
console.log('6. Click "Create Web Service"');

console.log("\n🧪 TEST COMMANDS (after deployment):");
console.log("=====================================");
console.log("curl https://solidity-clarity-converter.onrender.com/health");

console.log("\n✨ Your API will be live in 2-3 minutes!");
console.log("\n🔒 Security Notes:");
console.log("- Never commit API keys to version control");
console.log("- Set environment variables directly in Render dashboard");
console.log("- .env file should be gitignored");
