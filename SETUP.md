# Setup Instructions

## Quick Setup (3 steps)

### Step 1: Create Environment File

Create a file named `.env.local` in the root directory (same level as `package.json`):

```bash
# API Configuration - REQUIRED
NEXT_PUBLIC_API_URL=http://localhost:8000

# Or use your actual backend URL
# NEXT_PUBLIC_API_URL=https://your-backend-domain.com

# Environment
NODE_ENV=development
```

**Important:** 
- The file must be named exactly `.env.local`
- Replace `http://localhost:8000` with your actual backend API URL
- The variable must start with `NEXT_PUBLIC_` to be available in the browser

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
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
3. **Replace** `http://localhost:8000` with your actual backend URL
4. **Restart** the development server (stop with Ctrl+C, then run `bun dev` again)

### Verify Environment Variables

After creating `.env.local`, restart your dev server. The app will now use:
- Your backend URL if `.env.local` is configured
- Default `http://localhost:8000` if the environment variable is not set

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

2. **Use HTTPS** for the API URL:
   ```
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

3. **Build and deploy:**
   ```bash
   bun run build
   bun run start
   ```

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

