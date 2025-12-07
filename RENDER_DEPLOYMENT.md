# ImgCraft - Render Deployment Guide

## 📋 Prerequisites

1. **GitHub Account** - Your code must be in a GitHub repository
2. **Render Account** - Sign up at [render.com](https://render.com)
3. **Supabase Project** - For authentication and database
4. **Razorpay Account** - For payment processing

## 🚀 Deployment Steps

### 1. Prepare Your Repository

Ensure these files are in your repository root:
- ✅ `requirements.txt` - Python dependencies
- ✅ `Procfile` - Tells Render how to run your app
- ✅ `runtime.txt` - Specifies Python version
- ✅ `.env.example` - Template for environment variables
- ✅ `app.py` - Your Flask application

### 2. Push to GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 3. Create Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `imgcraft` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120 app:app`

### 4. Set Environment Variables

In Render dashboard, go to **Environment** tab and add these variables:

#### Required Variables:

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=your-super-secret-key-change-this-in-production
DEBUG=False

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Admin Configuration
ADMIN_EMAILS=admin@example.com,admin2@example.com

# Server Configuration (Render sets PORT automatically)
HOST=0.0.0.0
# PORT is set automatically by Render

# File Upload Configuration
MAX_FILE_SIZE_MB=16
UPLOAD_FOLDER=uploads

# Logging
LOG_LEVEL=INFO
```

### 5. Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies from `requirements.txt`
   - Start your app using the `Procfile`

### 6. Configure Custom Domain (Optional)

1. In Render dashboard, go to **Settings** → **Custom Domain**
2. Add your domain (e.g., `imgcraft.com`)
3. Update DNS records as instructed by Render
4. Render provides free SSL certificates automatically

## 🔧 Post-Deployment Configuration

### Update Supabase Settings

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Render URL to **Site URL** and **Redirect URLs**:
   ```
   https://your-app-name.onrender.com
   ```

### Update Razorpay Webhook

1. Go to Razorpay Dashboard → **Settings** → **Webhooks**
2. Add webhook URL:
   ```
   https://your-app-name.onrender.com/api/payments/webhook
   ```
3. Select events: `payment.captured`, `payment.failed`

### Test Your Deployment

1. Visit your Render URL: `https://your-app-name.onrender.com`
2. Test authentication (signup/login)
3. Test file upload
4. Test payment flow
5. Check logs in Render dashboard

## 📊 Monitoring & Logs

### View Logs
- Go to Render dashboard → **Logs** tab
- Real-time logs show all application output
- Use filters to find specific errors

### Monitor Performance
- **Metrics** tab shows:
  - CPU usage
  - Memory usage
  - Request count
  - Response times

### Set Up Alerts
- Go to **Settings** → **Notifications**
- Configure email/Slack alerts for:
  - Deploy failures
  - High error rates
  - Resource usage

## 🔒 Security Best Practices

1. **Never commit `.env` file** - Add to `.gitignore`
2. **Use strong SECRET_KEY** - Generate with:
   ```python
   import secrets
   print(secrets.token_hex(32))
   ```
3. **Enable HTTPS** - Render provides this automatically
4. **Rotate secrets regularly** - Update keys every 90 days
5. **Use environment variables** - Never hardcode sensitive data

## 🐛 Troubleshooting

### Build Fails

**Problem**: Dependencies fail to install

**Solution**:
- Check `requirements.txt` for version conflicts
- Ensure `opencv-python-headless` is used (not `opencv-python`)
- Check Python version in `runtime.txt` matches your local version

### App Crashes on Start

**Problem**: Gunicorn fails to start

**Solution**:
- Check `Procfile` syntax
- Verify `app:app` points to your Flask app instance
- Check logs for specific error messages

### Database Connection Errors

**Problem**: Can't connect to Supabase

**Solution**:
- Verify `SUPABASE_URL` and keys are correct
- Check Supabase project is active
- Ensure RLS policies are configured correctly

### File Upload Fails

**Problem**: Images can't be uploaded

**Solution**:
- Render uses ephemeral storage - files are temporary
- For persistent storage, use:
  - Supabase Storage
  - AWS S3
  - Cloudinary

### Memory Issues

**Problem**: App runs out of memory

**Solution**:
- Upgrade Render plan for more RAM
- Optimize image processing (reduce max file size)
- Use image streaming instead of loading entire files

## 📈 Scaling

### Free Tier Limitations
- 512 MB RAM
- Shared CPU
- Spins down after 15 minutes of inactivity
- 750 hours/month free

### Upgrade Options
1. **Starter** ($7/month): 512 MB RAM, always on
2. **Standard** ($25/month): 2 GB RAM, better performance
3. **Pro** ($85/month): 4 GB RAM, dedicated resources

### Performance Optimization
- Use CDN for static files
- Enable caching headers
- Optimize images before processing
- Use background workers for heavy tasks

## 🔄 CI/CD (Continuous Deployment)

Render automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push origin main

# Render automatically:
# 1. Detects push
# 2. Builds new version
# 3. Runs tests (if configured)
# 4. Deploys if successful
```

### Disable Auto-Deploy
- Go to **Settings** → **Build & Deploy**
- Toggle **Auto-Deploy** off
- Deploy manually from dashboard

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `FLASK_ENV` | Yes | Environment mode | `production` |
| `SECRET_KEY` | Yes | Flask secret key | `abc123...` |
| `SUPABASE_URL` | Yes | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service key | `eyJ...` |
| `RAZORPAY_KEY_ID` | Yes | Razorpay key ID | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay secret | `abc123...` |
| `ADMIN_EMAILS` | No | Admin email addresses | `admin@example.com` |
| `MAX_FILE_SIZE_MB` | No | Max upload size | `16` |
| `LOG_LEVEL` | No | Logging level | `INFO` |

## 🎯 Success Checklist

- [ ] Code pushed to GitHub
- [ ] Render web service created
- [ ] All environment variables set
- [ ] App successfully deployed
- [ ] Custom domain configured (optional)
- [ ] Supabase URLs updated
- [ ] Razorpay webhook configured
- [ ] Authentication tested
- [ ] File upload tested
- [ ] Payment flow tested
- [ ] Logs reviewed for errors
- [ ] Performance monitored

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Supabase Docs**: https://supabase.com/docs
- **Razorpay Docs**: https://razorpay.com/docs

## 🎉 You're Live!

Your ImgCraft application is now running on Render! 🚀

Monitor your app, gather user feedback, and iterate based on real-world usage.

---

**Last Updated**: December 2024
**ImgCraft Version**: 1.0.0
