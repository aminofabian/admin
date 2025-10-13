# 🎭 Mock Data Mode - Quick Guide

## Current Status: Using Mock Data ✅

The Companies page is currently running with **mock data** instead of making real API calls. This allows you to develop and test the UI without needing the backend running.

---

## 📊 What's Included

### Mock Companies (8 samples):
1. **Gaming Pro Platform** - Active
2. **Casino King** - Active
3. **Slots Master** - Inactive
4. **Bet Zone** - Active
5. **Lucky Spin Casino** - Active
6. **Mega Wins** - Inactive
7. **Jackpot City** - Active
8. **Royal Casino** - Active

### Working Features:
✅ **List** - View all companies with pagination (10 per page)  
✅ **Search** - Filter by username, email, or project name  
✅ **Create** - Add new companies (appears at top of list)  
✅ **Edit** - Update existing companies  
✅ **Toggle Status** - Activate/Deactivate companies  
✅ **Simulated Network Delays** - Realistic loading states (800-1000ms)

---

## 🔄 How to Switch Back to Real API

### Step 1: Uncomment the Real API Import

In `/app/dashboard/companies/page.tsx`, change this:

```typescript
// import { companiesApi } from '@/lib/api'; // Suspended for mock data
```

To this:

```typescript
import { companiesApi } from '@/lib/api';
```

### Step 2: Replace Mock API Calls

Find and replace these 4 instances:

#### List Companies:
```typescript
// CHANGE FROM:
const response = await mockCompaniesApi.list({

// CHANGE TO:
const response = await companiesApi.list({
```

#### Create Company:
```typescript
// CHANGE FROM:
const response = await mockCompaniesApi.create(formData as CreateCompanyRequest);

// CHANGE TO:
const response = await companiesApi.create(formData as CreateCompanyRequest);
```

#### Update Company:
```typescript
// CHANGE FROM:
await mockCompaniesApi.partialUpdate(selectedCompany.id, formData as UpdateCompanyRequest);

// CHANGE TO:
await companiesApi.partialUpdate(selectedCompany.id, formData as UpdateCompanyRequest);
```

#### Toggle Status:
```typescript
// CHANGE FROM:
await mockCompaniesApi.partialUpdate(company.id, { is_active: !company.is_active });

// CHANGE TO:
await companiesApi.partialUpdate(company.id, { is_active: !company.is_active });
```

### Step 3: Remove Mock Code (Optional)

Once you're using the real API, you can remove:

1. The mock data array (lines 26-116)
2. The `delay` function (line 119)
3. The `mockCompaniesApi` object (lines 122-198)
4. The blue "Development Mode" banner (lines 324-330)

### Step 4: Verify Environment

Make sure your `.env.local` has:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

---

## 🧪 Testing with Mock Data

### What You Can Test:
- ✅ All UI interactions
- ✅ Form validation
- ✅ Loading states
- ✅ Success/error messages
- ✅ Search functionality
- ✅ Pagination
- ✅ Modal behavior
- ✅ Responsive design

### What You Can't Test:
- ❌ Real backend validation errors (e.g., duplicate username)
- ❌ Actual database persistence
- ❌ Authentication/authorization
- ❌ Network error handling

### Known Limitations:
- 🔄 **Page Refresh** - Mock data resets to initial 8 companies
- 💾 **No Persistence** - Changes lost on refresh
- 🔍 **Client-side Search** - Real API may have different search behavior
- 📊 **Pagination** - Real API may have different page sizes

---

## 🎯 Quick Test Scenarios

### 1. Create a New Company
```
Project Name: Test Platform
Username: testuser
Email: test@example.com
(etc...)
```
Result: Should appear at the top of the list

### 2. Search for a Company
```
Search: "casino"
```
Result: Should show Casino King and Royal Casino

### 3. Edit a Company
- Click edit icon on any company
- Change project name
- Submit
Result: Should update in the table

### 4. Toggle Status
- Click status icon on an active company
- Confirm
Result: Badge should change to "Inactive"

### 5. Test Pagination
- Currently shows 8 companies (fits on 1 page)
- Add 3+ more companies to test pagination
Result: Should see "Next" button appear

---

## 💡 Pro Tips

### Add More Mock Data
Want more test data? Add to the `MOCK_COMPANIES` array:

```typescript
{
  id: 9, // Increment ID
  username: 'your_username',
  email: 'your@email.com',
  project_name: 'Your Platform',
  project_domain: 'https://yoursite.com',
  admin_project_domain: 'https://admin.yoursite.com',
  is_active: true,
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
},
```

### Adjust Network Delays
Make the mock API faster/slower:

```typescript
// In mockCompaniesApi functions:
await delay(800); // Change this number (in milliseconds)
```

### Test Error Scenarios
Add error simulation:

```typescript
// In any mock function:
if (Math.random() > 0.8) { // 20% chance of error
  throw new Error('Simulated network error');
}
```

---

## 🔍 Debugging

### Mock Data Not Showing?
1. Check browser console for errors
2. Verify `MOCK_COMPANIES` array is populated
3. Check that `loadCompanies()` is being called

### Changes Not Persisting?
This is expected! Mock data only persists in memory during your session. Refresh = reset.

### Search Not Working?
The mock search is case-insensitive and matches partial strings in:
- Username
- Email  
- Project Name

---

## 📝 When Ready for Production

### Checklist:
- [ ] Backend API is running
- [ ] API URL is configured in `.env.local`
- [ ] Authentication is working (JWT token)
- [ ] All 4 API calls switched to real `companiesApi`
- [ ] Mock code removed (optional)
- [ ] Development banner removed
- [ ] Tested with real backend

---

## 🎉 Current Features Working with Mock Data

| Feature | Status | Notes |
|---------|--------|-------|
| List Companies | ✅ Working | 8 sample companies |
| Search | ✅ Working | Client-side filtering |
| Pagination | ✅ Working | 10 per page |
| Create Company | ✅ Working | Adds to top of list |
| Edit Company | ✅ Working | Updates in place |
| Toggle Status | ✅ Working | Active/Inactive |
| Loading States | ✅ Working | 800-1000ms delay |
| Success Messages | ✅ Working | Auto-dismiss |
| Form Validation | ✅ Working | Client-side only |
| Responsive Design | ✅ Working | All screen sizes |

---

**You can now test the entire UI at:** `http://localhost:3000/dashboard/companies`

No backend needed! 🚀

