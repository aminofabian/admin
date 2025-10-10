# Architecture Documentation

## Project Overview

This is a modern Next.js 15 admin panel built with TypeScript, following strict coding principles and best practices for maintainability and scalability.

## Folder Structure

```
admin/
├── app/                          # Next.js App Router
│   ├── dashboard/               # Protected dashboard routes
│   │   ├── companies/          # Company management (superadmin only)
│   │   ├── managers/           # Manager management
│   │   ├── agents/             # Agent management
│   │   ├── staffs/             # Staff management
│   │   ├── players/            # Player management
│   │   ├── games/              # Game management
│   │   ├── transactions/       # Transaction tracking
│   │   ├── bonuses/            # Bonus configuration
│   │   ├── banners/            # Banner management
│   │   ├── affiliates/         # Affiliate management
│   │   ├── layout.tsx          # Dashboard layout wrapper
│   │   └── page.tsx            # Dashboard home
│   ├── login/                   # Authentication page
│   ├── layout.tsx               # Root layout with providers
│   └── page.tsx                 # Root redirect page
│
├── components/                   # React components
│   ├── ui/                      # Reusable UI components
│   │   ├── button.tsx          # Button with variants
│   │   ├── input.tsx           # Input with label/error
│   │   ├── card.tsx            # Card components
│   │   ├── table.tsx           # Table components
│   │   ├── badge.tsx           # Status badges
│   │   ├── pagination.tsx      # Pagination controls
│   │   ├── search-input.tsx    # Search with icon
│   │   └── index.ts            # Barrel export
│   │
│   ├── features/                # Feature-specific components
│   │   ├── loading-state.tsx   # Loading spinner
│   │   ├── error-state.tsx     # Error display
│   │   ├── empty-state.tsx     # Empty state
│   │   └── index.ts            # Barrel export
│   │
│   └── layout/                  # Layout components
│       ├── sidebar.tsx         # Navigation sidebar
│       ├── header.tsx          # Top header with user info
│       ├── dashboard-layout.tsx # Layout wrapper
│       └── index.ts            # Barrel export
│
├── lib/                          # Core libraries
│   ├── api/                     # API client layer
│   │   ├── client.ts           # Base API client
│   │   ├── auth.ts             # Authentication endpoints
│   │   ├── companies.ts        # Company endpoints
│   │   ├── users.ts            # User endpoints
│   │   ├── games.ts            # Game endpoints
│   │   ├── transactions.ts     # Transaction endpoints
│   │   ├── bonuses.ts          # Bonus endpoints
│   │   ├── banners.ts          # Banner endpoints
│   │   ├── affiliates.ts       # Affiliate endpoints
│   │   └── index.ts            # Barrel export
│   │
│   ├── constants/               # Application constants
│   │   ├── api.ts              # API URLs and endpoints
│   │   └── roles.ts            # User roles and permissions
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── use-pagination.ts   # Pagination state
│   │   ├── use-search.ts       # Debounced search
│   │   └── index.ts            # Barrel export
│   │
│   └── utils/                   # Utility functions
│       ├── storage.ts          # localStorage wrapper
│       └── formatters.ts       # Data formatters
│
├── providers/                    # Context providers
│   └── auth-provider.tsx        # Authentication context
│
├── types/                        # TypeScript definitions
│   ├── api.ts                   # API response types
│   ├── auth.ts                  # Authentication types
│   ├── company.ts               # Company types
│   ├── user.ts                  # User types
│   ├── game.ts                  # Game types
│   ├── transaction.ts           # Transaction types
│   ├── bonus.ts                 # Bonus types
│   ├── banner.ts                # Banner types
│   ├── affiliate.ts             # Affiliate types
│   └── index.ts                 # Barrel export
│
└── public/                       # Static assets
```

## Design Principles

### 1. Single Responsibility (One Export per File)
Each file exports one main thing, making the codebase predictable:
- Component files export one component
- API files export one API module
- Type files export related types

### 2. Shallow Nesting (Max 3 Levels)
Code is kept flat to improve readability:
```typescript
// ❌ Bad - Too nested
if (user) {
  if (user.role === 'admin') {
    if (user.permissions.includes('edit')) {
      // Too deep!
    }
  }
}

// ✅ Good - Early returns
if (!user) return;
if (user.role !== 'admin') return;
if (!user.permissions.includes('edit')) return;
// Do work
```

### 3. Small Functions (≤ 40 lines)
Functions fit on one screen for better comprehension:
- Extract complex logic into helper functions
- Use composition over large implementations
- Keep components focused on rendering

### 4. Clear Naming (Self-Documenting)
Names explain purpose without comments:
```typescript
// ❌ Bad
const d = new Date();
const calc = (a, b) => a + b;

// ✅ Good
const createdAt = new Date();
const calculateTotalPrice = (price, tax) => price + tax;
```

### 5. No Magic Values
Use constants instead of hardcoded values:
```typescript
// ❌ Bad
if (status === 'pending') { ... }

// ✅ Good
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
} as const;

if (status === TRANSACTION_STATUS.PENDING) { ... }
```

## Architecture Patterns

### API Layer

**client.ts** - Base HTTP client with:
- Authentication header injection
- Centralized error handling
- Request/response interceptors
- Support for JSON and FormData

**Feature APIs** - Grouped by domain:
- Each API module handles one resource
- Consistent method naming (list, create, update, delete)
- Type-safe request/response handling

### State Management

**React Context** for global state:
- Authentication state in `AuthProvider`
- User session management
- Token storage and refresh

**Local State** for component state:
- `useState` for simple state
- `useEffect` for side effects
- Custom hooks for reusable logic

### Custom Hooks

**usePagination**
- Manages page number and page size
- Provides navigation methods
- Resets to page 1 when needed

**useSearch**
- Debounced search input
- Prevents excessive API calls
- Returns both immediate and debounced values

### Component Structure

**UI Components** (`components/ui/`)
- Dumb, presentational components
- No business logic
- Highly reusable
- Styled with Tailwind CSS

**Feature Components** (`components/features/`)
- Specific to use cases
- Can contain light logic
- Compose UI components

**Layout Components** (`components/layout/`)
- Page structure
- Navigation
- Authentication guards

### Routing Structure

**Public Routes:**
- `/` - Redirects to login or dashboard
- `/login` - Authentication page

**Protected Routes** (require auth):
- `/dashboard` - Dashboard home
- `/dashboard/companies` - Company management
- `/dashboard/managers` - Manager management
- `/dashboard/agents` - Agent management
- `/dashboard/staffs` - Staff management
- `/dashboard/players` - Player management
- `/dashboard/games` - Game management
- `/dashboard/transactions` - Transaction tracking
- `/dashboard/bonuses` - Bonus configuration
- `/dashboard/banners` - Banner management
- `/dashboard/affiliates` - Affiliate management

### Role-Based Access Control

Implemented at multiple levels:

**1. Navigation Level** (Sidebar)
```typescript
const NAV_ITEMS = [
  { name: 'Companies', roles: [USER_ROLES.SUPERADMIN] },
  { name: 'Managers', roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY] },
  // ...
];
```

**2. Route Level** (DashboardLayout)
- Authentication check via `AuthProvider`
- Redirects unauthenticated users to login

**3. API Level** (Backend)
- JWT token validation
- Role-based endpoint access
- Project scoping

## Data Flow

### Authentication Flow
1. User enters credentials on `/login`
2. `authApi.login()` sends request to backend
3. Backend validates and returns JWT + user data
4. Tokens stored in localStorage
5. User data stored in `AuthProvider` context
6. User redirected to `/dashboard`
7. Subsequent API calls include JWT in headers

### Data Fetching Flow
1. Page component mounts
2. `useEffect` triggers data fetch
3. API client sends authenticated request
4. Loading state shown to user
5. Response parsed and typed
6. State updated with data
7. Component re-renders with data

### Error Handling Flow
1. API request fails
2. Error caught in try/catch
3. Error message extracted
4. Error state updated
5. ErrorState component shown
6. User can retry action

## Type Safety

All data structures are fully typed:

**API Responses:**
```typescript
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
```

**Domain Models:**
```typescript
interface Player extends BaseUser {
  role: 'player';
  full_name: string;
  balance: string;
  winning_balance: string;
}
```

**Request Payloads:**
```typescript
interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}
```

## Performance Optimizations

1. **Debounced Search** - Reduces API calls
2. **Pagination** - Limits data fetching
3. **Component Memoization** - React.memo for expensive renders
4. **Code Splitting** - Automatic via Next.js
5. **Asset Optimization** - Next.js Image component

## Testing Strategy

**Unit Tests** (recommended):
- API client functions
- Utility functions
- Custom hooks
- Pure components

**Integration Tests**:
- Authentication flow
- Data fetching
- Form submissions

**E2E Tests**:
- Critical user journeys
- Login/logout
- CRUD operations

## Environment Configuration

**Development:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NODE_ENV=development
```

**Production:**
```env
NEXT_PUBLIC_API_URL=https://api.production.com
NODE_ENV=production
```

## Security Considerations

1. **JWT Storage** - Tokens in localStorage (consider httpOnly cookies for production)
2. **HTTPS Only** - All API calls over HTTPS
3. **Input Validation** - Client and server-side
4. **Role Checks** - Multiple layers of access control
5. **XSS Prevention** - React escapes by default
6. **CSRF Protection** - Backend implementation

## Deployment Checklist

- [ ] Set environment variables
- [ ] Configure CORS on backend
- [ ] Enable HTTPS
- [ ] Set up error monitoring (Sentry)
- [ ] Configure analytics
- [ ] Set up CI/CD pipeline
- [ ] Run production build test
- [ ] Security audit
- [ ] Performance audit
- [ ] SEO optimization

## Adding New Features

### 1. Add Types
Create type definitions in `types/[feature].ts`

### 2. Create API Client
Add endpoint module in `lib/api/[feature].ts`

### 3. Build UI Components
Create components in `components/ui/` or `components/features/`

### 4. Create Page
Add route in `app/dashboard/[feature]/page.tsx`

### 5. Update Navigation
Add link in `components/layout/sidebar.tsx` with role restrictions

### 6. Test
Test the feature flow end-to-end

## Common Patterns

### Fetching and Displaying List Data
```typescript
const [data, setData] = useState<PaginatedResponse<T> | null>(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState('');
const { page, pageSize, setPage } = usePagination();
const { search, debouncedSearch, setSearch } = useSearch();

useEffect(() => {
  loadData();
}, [page, pageSize, debouncedSearch]);

const loadData = async () => {
  try {
    setIsLoading(true);
    setError('');
    const response = await api.list({ page, page_size: pageSize, search: debouncedSearch });
    setData(response);
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to load data');
  } finally {
    setIsLoading(false);
  }
};
```

### Creating Resources
```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (formData: CreateRequest) => {
  try {
    setIsSubmitting(true);
    await api.create(formData);
    // Refresh list or navigate
  } catch (err) {
    // Handle error
  } finally {
    setIsSubmitting(false);
  }
};
```

## Maintenance

### Regular Updates
- Keep dependencies updated
- Review and fix linter warnings
- Update TypeScript types as API changes
- Refactor as complexity grows

### Code Reviews
- Check adherence to design principles
- Verify type safety
- Ensure proper error handling
- Validate security practices

### Documentation
- Update README for new features
- Document complex business logic
- Keep API types in sync with backend
- Maintain this architecture document

