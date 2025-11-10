# Cloudinary Installation

## 1. Install the package

```bash
npm install cloudinary
# or
bun add cloudinary
```

## 2. Add environment variables to `.env.local`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 3. Get your Cloudinary credentials

1. Sign up at https://cloudinary.com (free tier available)
2. Go to your Dashboard: https://console.cloudinary.com/
3. Copy these values:
   - **Cloud Name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

## 4. Restart your dev server

```bash
# Stop the server (Ctrl+C) then restart
npm run dev
# or
bun dev
```

## Done! 🎉

Your image uploads will now work in production (serverless environments).
