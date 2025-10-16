# Zustand Stores Documentation

## Overview

This directory contains global state management stores using [Zustand](https://github.com/pmndrs/zustand), a lightweight state management library for React.

## Store Structure

Each store follows a consistent pattern:

```typescript
interface [Entity]State {
  // Data state
  [entity]: PaginatedResponse<[Entity]> | null;
  isLoading: boolean;
  error: string | null;
  
  // UI state (pagination, search, etc.)
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface [Entity]Actions {
  // Data fetching
  fetch[Entities]: () => Promise<void>;
  
  // CRUD operations
  create[Entity]: (data: Create[Entity]Request) => Promise<[Entity]>;
  update[Entity]: (id: number, data: Update[Entity]Request) => Promise<[Entity]>;
  partialUpdate[Entity]: (id: number, data: Partial<Update[Entity]Request>) => Promise<[Entity]>;
  
  // UI state management
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}
```

## Companies Store

### Usage

```typescript
import { useCompaniesStore } from '@/stores';

function CompaniesComponent() {
  const {
    // State
    companies,
    isLoading,
    error,
    currentPage,
    searchTerm,
    
    // Actions
    fetchCompanies,
    createCompany,
    updateCompany,
    partialUpdateCompany,
    setPage,
    setSearchTerm,
    reset,
  } = useCompaniesStore();
  
  // Fetch on mount
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);
  
  // Handle pagination
  const handlePageChange = (page: number) => {
    setPage(page); // Automatically triggers fetchCompanies
  };
  
  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term); // Automatically triggers fetchCompanies and resets to page 1
  };
  
  // Handle create
  const handleCreate = async (data: CreateCompanyRequest) => {
    try {
      const newCompany = await createCompany(data);
      // List is automatically refreshed after creation
      console.log('Created:', newCompany);
    } catch (error) {
      console.error('Creation failed:', error);
    }
  };
  
  return (
    <div>
      {isLoading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {companies?.results?.map(company => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
}
```

### API Integration

The store integrates with the backend API at `/api/v1/companies/`:

- **GET** `/api/v1/companies/` - List all companies (with pagination & search)
- **POST** `/api/v1/companies/` - Create a new company
- **PUT** `/api/v1/companies/{id}/` - Update a company
- **PATCH** `/api/v1/companies/{id}/` - Partially update a company

### Features

✅ **Automatic List Refresh**: After create/update/delete operations, the list automatically refreshes

✅ **Smart Pagination**: Page state is automatically managed and synced with API calls

✅ **Debounced Search**: Search triggers automatic refetch with reset to page 1

✅ **Error Handling**: All errors are caught and stored in the error state

✅ **Loading States**: `isLoading` flag for showing loading indicators

✅ **Type Safety**: Fully typed with TypeScript interfaces

## Best Practices

### ✅ DO

```typescript
// ✅ Use the store hook at the component level
function MyComponent() {
  const { fetchCompanies } = useCompaniesStore();
  
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);
}

// ✅ Handle errors gracefully
const handleCreate = async (data: CreateCompanyRequest) => {
  try {
    await createCompany(data);
    toast.success('Company created!');
  } catch (error) {
    toast.error(error.message);
  }
};

// ✅ Use selective subscription to avoid unnecessary re-renders
function CompanyCount() {
  const count = useCompaniesStore(state => state.companies?.count ?? 0);
  return <div>Total: {count}</div>;
}
```

### ❌ DON'T

```typescript
// ❌ Don't mutate store state directly
const { companies } = useCompaniesStore();
companies.results.push(newCompany); // WRONG!

// ❌ Don't fetch data outside of the store
async function badFetch() {
  const data = await companiesApi.list(); // Use store actions instead
}

// ❌ Don't mix store state with local state for the same data
const [localCompanies, setLocalCompanies] = useState([]); // Unnecessary!
const { companies } = useCompaniesStore(); // Just use this
```

## Adding a New Store

To create a new store for another entity (e.g., `users`):

1. **Create the store file**: `stores/use-users-store.ts`

```typescript
import { create } from 'zustand';
import { usersApi } from '@/lib/api';
import type { User, CreateUserRequest, UpdateUserRequest, PaginatedResponse } from '@/types';

interface UsersState {
  users: PaginatedResponse<User> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface UsersActions {
  fetchUsers: () => Promise<void>;
  createUser: (data: CreateUserRequest) => Promise<User>;
  updateUser: (id: number, data: UpdateUserRequest) => Promise<User>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type UsersStore = UsersState & UsersActions;

const initialState: UsersState = {
  users: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const useUsersStore = create<UsersStore>((set, get) => ({
  ...initialState,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { currentPage, pageSize, searchTerm } = get();
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };
      const data = await usersApi.list(filters);
      set({ users: data, isLoading: false, error: null });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      set({ error: errorMessage, isLoading: false });
    }
  },

  createUser: async (data: CreateUserRequest) => {
    try {
      const response = await usersApi.create(data);
      await get().fetchUsers();
      return response.data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create user';
      set({ error: errorMessage });
      throw err;
    }
  },

  updateUser: async (id: number, data: UpdateUserRequest) => {
    try {
      const response = await usersApi.update(id, data);
      await get().fetchUsers();
      return response.data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user';
      set({ error: errorMessage });
      throw err;
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchUsers();
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term, currentPage: 1 });
    get().fetchUsers();
  },

  reset: () => {
    set(initialState);
  },
}));
```

2. **Export from index**: `stores/index.ts`

```typescript
export { useCompaniesStore } from './use-companies-store';
export { useUsersStore } from './use-users-store'; // Add new store
```

3. **Use in components**:

```typescript
import { useUsersStore } from '@/stores';

function UsersComponent() {
  const { users, fetchUsers } = useUsersStore();
  // ... rest of component
}
```

## Migration from Local State

### Before (with local state)

```typescript
function CompaniesSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await companiesApi.list({ 
        page: currentPage, 
        search: searchTerm 
      });
      setData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [searchTerm, currentPage]);
}
```

### After (with Zustand)

```typescript
function CompaniesSection() {
  const {
    companies: data,
    isLoading: loading,
    error,
    searchTerm,
    currentPage,
    fetchCompanies,
    setPage,
    setSearchTerm,
  } = useCompaniesStore();

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);
  
  // All state management is now handled by the store!
}
```

## Benefits

1. **Centralized State**: All company-related state in one place
2. **Reusable**: Use the same store across multiple components
3. **Automatic Synchronization**: Changes in one component reflect everywhere
4. **Reduced Boilerplate**: No need to prop drill or use Context
5. **Better Performance**: Only re-render when subscribed state changes
6. **Easier Testing**: Mock the store instead of API calls

## Resources

- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [Zustand Best Practices](https://docs.pmnd.rs/zustand/guides/practice-with-no-store-actions)

