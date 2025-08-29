# 🚀 Quick Deploy Guide

## Option 1: One-Click Deploy Button

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/gokkull-15/satoshiscript-ai)

## Option 2: Manual Deploy (2 minutes)

### Step 1: Run the deploy script

```bash
./deploy.sh
```

### Step 2: Deploy on Render

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect GitHub repo: `gokkull-15/satoshiscript-ai`
4. Settings:
   ```
   Name: solidity-clarity-converter
   Build Command: npm install
   Start Command: npm start
   ```
5. Environment Variables:
   ```
   GROQ_API_KEY = [your-groq-api-key]
   NODE_ENV = production
   ```
6. Click **"Create Web Service"**

### Step 3: Test Your API

```bash
# Replace with your actual Render URL
curl https://solidity-clarity-converter.onrender.com/health
```

## Your API Endpoints:

- `GET /health` - Health check
- `POST /convert` - Convert Solidity to Clarity
- `POST /convert/plain` - Plain text conversion
- `POST /explain` - Explain Clarity code
- `POST /convert-explain` - Convert + explain

## Example Usage:

```bash
curl -X POST https://your-service.onrender.com/convert/plain \
  -H "Content-Type: application/json" \
  -d '{"solidity_code": "contract Test { uint x; }"}'
```

## 🎯 Expected Response:

```clarity
(define-data-var stored-x uint u0)
(define-public (set-data (param-x uint))
  (ok (var-set stored-x param-x)))
```
