# 🚀 Deployment Guide

## Quick Deploy to Render

### 1. Run Deployment Helper

```bash
node deploy-helper.js
```

### 2. Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repo: `gokkull-15/satoshiscript-ai`

### 3. Configure Service

```
Name: solidity-clarity-converter
Build Command: npm install
Start Command: npm start
```

### 4. Add Environment Variables

In Render dashboard, add:

```
GROQ_API_KEY = [your-actual-groq-api-key]
NODE_ENV = production
```

### 5. Deploy

Click **"Create Web Service"**

## Test Your Deployment

```bash
# Health check
curl https://solidity-clarity-converter.onrender.com/health

# Convert code
curl -X POST https://solidity-clarity-converter.onrender.com/convert/plain \
  -H "Content-Type: application/json" \
  -d '{"solidity_code": "contract Test { uint x; }"}'
```

## 🔐 Security

- API keys are set directly in Render dashboard
- No secrets in code or version control
- HTTPS only in production
