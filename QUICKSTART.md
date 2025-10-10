# Quick Start Guide

## Prerequisites

- Node.js 18+ or Bun installed
- Backend API running
- Git (optional)

## Setup Steps

### 1. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install

# Or using yarn
yarn install
```

### 2. Configure Environment

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set your backend API URL:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

### 3. Run Development Server

```bash
# Using Bun
bun dev

# Or using npm
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## First Login

### Superadmin Login
```
Username: your-superadmin-username
Password: your-password
Project UUID: (leave empty)
```

### Company Admin Login
```
Username: company-username
Password: company-password
Project UUID: your-company-uuid
```

## Project Structure Overview

```
admin/
├── app/                  # Pages and routes
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   ├── features/        # Feature components
│   └── layout/          # Layout components
├── lib/                  # Core utilities
│   ├── api/             # API client
│   ├── constants/       # App constants
│   ├── hooks/           # Custom hooks
│   └── utils/           # Utility functions
├── providers/            # Context providers
└── types/               # TypeScript types
```

## Available Pages

After logging in, you'll have access to:

- **Dashboard** - Overview and statistics
- **Companies** - Manage companies (superadmin only)
- **Managers** - Manage manager accounts
- **Agents** - Manage agent accounts
- **Staff** - Manage staff accounts
- **Players** - Manage player accounts
- **Games** - View and manage games
- **Transactions** - Track all transactions
- **Bonuses** - Configure bonus settings
- **Banners** - Manage promotional banners
- **Affiliates** - Track affiliate performance

## Key Features

### Role-Based Access
Different roles see different menu items automatically.

### Search & Pagination
All list pages support:
- Real-time search (debounced)
- Pagination controls
- Responsive tables

### Error Handling
All API calls include:
- Loading states
- Error messages
- Retry functionality

### Type Safety
Full TypeScript coverage for:
- API requests/responses
- Component props
- State management

## Common Tasks

### Adding a New Page

1. Create page file: `app/dashboard/[feature]/page.tsx`
2. Add route to sidebar: `components/layout/sidebar.tsx`
3. Create API module: `lib/api/[feature].ts`
4. Define types: `types/[feature].ts`

### Calling an API

```typescript
import { playersApi } from '@/lib/api';

const loadPlayers = async () => {
  try {
    const response = await playersApi.list({ page: 1, page_size: 10 });
    console.log(response.results);
  } catch (error) {
    console.error('Failed to load players:', error);
  }
};
```

### Using Custom Hooks

```typescript
import { usePagination, useSearch } from '@/lib/hooks';

function MyComponent() {
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();
  
  // Use page, pageSize, debouncedSearch in API calls
}
```

## Development Tips

### Hot Reload
Changes to code automatically reload the browser.

### TypeScript Errors
Check TypeScript errors in your IDE or run:
```bash
bun run build
```

### Linting
Run ESLint:
```bash
bun run lint
```

### Code Style
The project follows strict conventions:
- Max 3 nesting levels
- Functions ≤ 40 lines
- Clear naming
- One export per file
- No magic numbers

## Building for Production

```bash
# Build the application
bun run build

# Start production server
bun run start
```

## Troubleshooting

### API Connection Issues
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running
- Check CORS settings on backend

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check JWT token validity
- Verify credentials with backend team

### Build Errors
- Delete `.next` folder and rebuild
- Clear node_modules and reinstall
- Check TypeScript errors

## Getting Help

### Documentation
- `README.md` - Project overview
- `ARCHITECTURE.md` - Detailed architecture guide
- This file - Quick start guide

### Code Structure
All code follows consistent patterns:
- Check existing pages for examples
- API modules follow same structure
- Components use similar patterns

## Next Steps

1. **Explore the codebase** - Look at existing pages
2. **Review the API** - Check `lib/api/` modules
3. **Understand types** - Review `types/` directory
4. **Read architecture** - See `ARCHITECTURE.md`
5. **Start building** - Add your custom features

## Production Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms
- Build: `bun run build`
- Start: `bun run start`
- Set environment variables in platform settings

## Security Notes

⚠️ **Important for Production:**
- Use HTTPS only
- Set secure token storage (httpOnly cookies)
- Enable CORS properly
- Use environment variables for secrets
- Regular security audits
- Keep dependencies updated

## Support

For issues or questions:
1. Check this guide
2. Review `ARCHITECTURE.md`
3. Check backend API documentation
4. Contact your team lead

---

**Happy coding! 🚀**

