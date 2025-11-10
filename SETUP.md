# Setup Instructions

## Quick Setup (3 steps)

### Step 1: Create Environment File

Create a file named `.env.local` in the root directory (same level as `package.json`):

```bash
# API Configuration - REQUIRED
NEXT_PUBLIC_API_URL=https://admin.serverhub.biz

# For local development
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Cloudinary Configuration - REQUIRED for image uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Environment
NODE_ENV=development
```

**Important:** 
- The file must be named exactly `.env.local`
- Current API URL is set to `https://admin.serverhub.biz`
- The variable must start with `NEXT_PUBLIC_` to be available in the browser
- For local backend development, change the URL to `http://localhost:8000`

### Step 2: Install Dependencies

```bash
bun install
# or
npm install
```

### Step 3: Run Development Server

```bash
bun dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## Troubleshooting "Invalid URL" Error

If you see **"Failed to construct 'URL': Invalid URL"**, it means the `.env.local` file is missing or not configured correctly.

### Solution:

1. **Create `.env.local`** in the project root (if it doesn't exist)
2. **Add this line:**
   ```
   NEXT_PUBLIC_API_URL=https://admin.serverhub.biz
   ```
3. **For local development**, use `http://localhost:8000` instead
4. **Restart** the development server (stop with Ctrl+C, then run `bun dev` again)

### Verify Environment Variables

After creating `.env.local`, restart your dev server. The app will now use:
- Your backend URL if `.env.local` is configured
- Default `http://localhost:8000` if the environment variable is not set

---

## Cloudinary Setup (For Image Uploads)

Image uploads require Cloudinary cloud storage (filesystem uploads don't work in serverless environments like Vercel).

### 1. Install Cloudinary Package

```bash
npm install cloudinary
# or
bun add cloudinary
```

### 2. Get Cloudinary Credentials

1. **Sign up** at https://cloudinary.com (free tier available - 25GB storage, 25GB bandwidth/month)
2. **Go to Dashboard**: https://console.cloudinary.com/
3. **Copy these values**:
   - **Cloud Name** → Use for `CLOUDINARY_CLOUD_NAME`
   - **API Key** → Use for `CLOUDINARY_API_KEY`
   - **API Secret** → Use for `CLOUDINARY_API_SECRET`

### 3. Add to `.env.local`

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

### 4. Restart Dev Server

```bash
# Stop the server (Ctrl+C) then restart
npm run dev
# or
bun dev
```

### 5. Test Image Upload

Try uploading an image in the chat. It should now upload to Cloudinary and return a `https://res.cloudinary.com/...` URL.

**Note:** Without Cloudinary configuration, image uploads will fail with an error message asking you to configure it.

---

## Backend API Requirements

Your backend must be running and accessible at the URL you configured. The app expects these endpoints:

- `POST /users/login/` - Authentication
- `GET /api/v1/companies/` - Company list
- `GET /api/v1/players/` - Player list
- `GET /api/v1/games/` - Game list
- etc.

See the API documentation for complete endpoint details.

---

## Production Setup

For production deployment:

1. **Set environment variables** in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   - AWS: Use parameter store or secrets manager

2. **Required environment variables for production**:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Build and deploy:**
   ```bash
   npm install
   npm run build
   npm run start
   ```

**Important:** Image uploads will NOT work in production without Cloudinary configuration. The filesystem is read-only on platforms like Vercel, Netlify, and AWS Lambda.

---

## Next Steps

After setup, you can:

1. Visit [http://localhost:3000](http://localhost:3000)
2. Login with your credentials
3. Start using the admin panel

For detailed information, see:
- `README.md` - Project overview
- `QUICKSTART.md` - Development guide
- `ARCHITECTURE.md` - Technical architecture

