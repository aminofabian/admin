# ProjectX Admin Panel

A modern, type-safe admin dashboard built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- 🔐 JWT-based authentication
- 👥 Role-based access control (Superadmin, Company, Manager, Agent, Staff, Player)
- 🏢 Company management
- 👤 User management (Managers, Agents, Staff, Players)
- 🎮 Game management
- 💰 Transaction tracking
- 🎁 Bonus configuration
- 🖼️ Banner management
- 🤝 Affiliate management
- 📊 Real-time data with pagination and search
- 🎨 Modern UI with responsive design

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **State Management:** React Context API
- **API Client:** Native Fetch API
- **Package Manager:** Bun/npm/yarn

## Project Structure

```
admin/
├── app/                      # Next.js app router pages
│   ├── dashboard/           # Protected dashboard pages
│   ├── login/               # Authentication pages
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   ├── features/            # Feature-specific components
│   └── layout/              # Layout components
├── lib/                     # Core libraries
│   ├── api/                 # API client and endpoints
│   ├── constants/           # Application constants
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Utility functions
├── providers/               # Context providers
├── types/                   # TypeScript type definitions
└── public/                  # Static assets
```

## Design Principles

This project follows strict coding standards:

-  **No More Than 3 Nesting Levels** - Keep code flat and readable
-  **Functions ≤ 40 lines** - Each function fits on one screen
-  **Clear Naming** - Code should be self-documenting
-  **One Export per File** - Single responsibility principle
-  **No Magic Numbers** - Use constants instead
-  **Test Logic** - Business logic should be tested
-  **Dumb Components** - Push state to containers/hooks
-  **DRY (Don't Repeat Yourself)** - But not at clarity's cost
-  **ESLint & Prettier** - Automated code quality
-  **Explicit Side Effects** - Clear separation of concerns

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Backend API running

### Quick Setup

1. **Create `.env.local` file** in the project root:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
   Replace with your actual backend URL.

2. **Install dependencies:**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Run development server:**
   ```bash
   bun dev
   # or
   npm run dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

⚠️ **Important:** If you see "Failed to construct 'URL': Invalid URL", you need to create the `.env.local` file. See `SETUP.md` for detailed instructions.

## Authentication

The app supports multi-tenant authentication:

- **Superadmin Login:** Username + Password
- **Company Login:** Username + Password + Project UUID

### Example Credentials Structure

```typescript
{
  username: "admin",
  password: "your-password",
  whitelabel_admin_uuid: "optional-uuid-for-company"
}
```

## API Integration

All API endpoints are configured in `lib/api/`:

- **Authentication:** `/users/login/`
- **Companies:** `/api/v1/companies/`
- **Users:** `/api/v1/{managers|agents|staffs|players}/`
- **Games:** `/api/v1/games/`
- **Transactions:** `/api/v1/transactions/`
- **Bonuses:** `/api/v1/{purchase|recharge|transfer|signup}-bonuses/`
- **Banners:** `/api/v1/admin-banners/`
- **Affiliates:** `/api/v1/affiliates/`

## Role-Based Access

Different roles have access to different features:

| Feature | Superadmin | Company | Manager | Agent | Staff | Player |
|---------|------------|---------|---------|-------|-------|--------|
| Companies |  | ❌ | ❌ | ❌ | ❌ | ❌ |
| Managers |  |  | ❌ | ❌ | ❌ | ❌ |
| Agents |  |  | ❌ | ❌ | ❌ | ❌ |
| Staff |  |  | ❌ | ❌ | ❌ | ❌ |
| Players |  |  |  | ❌ | ❌ | ❌ |
| Games |  |  |  | ❌ | ❌ | ❌ |
| Transactions |  |  |  | ❌ | ❌ | ❌ |
| Bonuses |  |  | ❌ | ❌ | ❌ | ❌ |
| Banners |  |  | ❌ | ❌ | ❌ | ❌ |
| Affiliates |  |  | ❌ | ❌ | ❌ | ❌ |

## Development

### Code Style

- Use ESLint for linting
- Use Prettier for formatting
- Follow TypeScript strict mode
- Keep functions small and focused
- Write descriptive variable names
- Avoid deep nesting

### Adding New Features

1. Create types in `types/`
2. Add API endpoints in `lib/api/`
3. Create UI components in `components/`
4. Build feature pages in `app/dashboard/`
5. Update navigation in `components/layout/sidebar.tsx`

### Custom Hooks

- `usePagination` - Handle pagination state
- `useSearch` - Debounced search input
- `useAuth` - Authentication state

## Building for Production

```bash
bun run build
# or
npm run build
```

## Deployment

The app can be deployed to:
- Vercel (recommended)
- Netlify
- AWS Amplify
- Any Node.js hosting

Make sure to set environment variables in your deployment platform.

## License

Private - All Rights Reserved
