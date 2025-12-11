# ImgCraft Docker Deployment

## Local Development with Docker

1. **Build the Docker image:**
```bash
docker-compose build
```

2. **Run the container:**
```bash
docker-compose up
```

3. **Access the app:**
```
http://localhost:8080
```

## Deploy to Render with Docker

### Option 1: Automatic Deployment (Recommended)

1. Push your code to GitHub
2. Go to Render Dashboard
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and deploy with Docker

### Option 2: Manual Docker Configuration

1. Create new Web Service on Render
2. Choose "Docker" as Environment
3. Set these values:
   - **Docker Build Context Directory:** `.`
   - **Dockerfile Path:** `./Dockerfile`
4. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `RAZORPAY_WEBHOOK_SECRET`

## Environment Variables

Create a `.env` file for local development:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

## Files Removed

- ❌ `Procfile` - Not needed with Docker
- ❌ Render build command - Docker handles everything

## Why Docker?

- ✅ Consistent environment across dev/production
- ✅ All system dependencies (OpenCV, etc.) pre-installed
- ✅ Better compatibility with `rembg` library
- ✅ Easier to debug and reproduce issues
- ✅ Python 3.12 (more stable than 3.13)

## Troubleshooting

**Port issues?** 
- Make sure PORT=8080 in environment variables

**Image processing errors?**
- Docker includes all required system libraries (libgl1-mesa-glx, etc.)

**Module not found?**
- Rebuild the image: `docker-compose build --no-cache`
