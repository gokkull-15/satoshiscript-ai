# Deployment Guide - Render

## Prerequisites

- GitHub repository with your code
- Render account (free tier available)
- Groq API key

## Deployment Steps

### 1. Push to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `solidity-clarity-converter`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (or paid for better performance)

### 3. Set Environment Variables

In Render dashboard, go to Environment tab and add:

- **GROQ_API_KEY**: Your Groq API key
- **NODE_ENV**: `production`
- **PORT**: `10000` (Render will set this automatically)

### 4. Deploy

Click "Create Web Service" and wait for deployment to complete.

## API Endpoints

Once deployed, your API will be available at:
`https://your-service-name.onrender.com`

### Available Endpoints:

- `GET /health` - Health check
- `POST /convert` - Convert Solidity to Clarity (JSON response)
- `POST /convert/plain` - Convert Solidity to Clarity (plain text)
- `POST /explain` - Explain Clarity code
- `POST /convert-explain` - Convert and explain in one call

### Example Usage:

```bash
curl -X POST https://your-service-name.onrender.com/convert/plain \
  -H "Content-Type: application/json" \
  -d '{"solidity_code": "contract Test { uint x; }"}'
```

## Notes

- Free tier may have cold starts (30-60 seconds delay after inactivity)
- For production use, consider upgrading to a paid plan
- Monitor logs in Render dashboard for debugging
