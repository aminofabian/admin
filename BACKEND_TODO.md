# Backend Implementation TODOs

## Missing Endpoints

### 1. Dashboard Statistics Endpoint ⚠️ REQUIRED

**Endpoint:** `GET /api/v1/dashboard/stats/`

**Status:** Not implemented (frontend currently uses fallback data)

**Purpose:** Provides real-time statistics for the admin dashboard

**Expected Response:**
```json
{
  "totalPlayers": 1250,
  "activePlayers": 850,
  "totalManagers": 15,
  "totalAgents": 45,
  "totalStaff": 8,
  "totalAffiliates": 32,
  "totalBalance": 125000.50,
  "totalWinningBalance": 45000.25,
  "platformLiquidity": 80000.25,
  "pendingTransactions": 23,
  "completedToday": 156,
  "failedToday": 3,
  "transactionSuccessRate": 98.1,
  "totalPurchasesToday": 85000.00,
  "totalCashoutsToday": 12000.00,
  "totalGames": 25,
  "activeGames": 22,
  "inactiveGames": 3
}
```

**Authentication:** Requires JWT token in `Authorization: Bearer <token>` header

**Permissions:** Available to all authenticated users (stats filtered by project/role)

**Implementation Notes:**
- Should aggregate data based on the authenticated user's project
- Company admins see only their project's stats
- Superadmins see global stats or need a `project_id` query param
- All monetary values should be Decimal/float
- Consider caching this data (1-5 minute cache) to avoid expensive queries on every dashboard load

**Frontend Files Affected:**
- `lib/constants/api.ts` - Endpoint definition
- `lib/api/dashboard.ts` - API client method
- `hooks/use-dashboard-stats.ts` - React hook (currently commented out)
- `app/dashboard/page.tsx` - Main dashboard consuming the stats

**To Enable Frontend:**
Once backend implements this endpoint, uncomment lines 21-22 in `hooks/use-dashboard-stats.ts`:
```typescript
const data = await dashboardApi.getStats();
setStats(data);
```

---

## Implementation Priority

1. **HIGH**: Dashboard Stats - Currently showing zero values on dashboard
2. Check if all other documented endpoints in `API_documentation.md` are actually implemented

---

## Testing Endpoints

You can test if an endpoint exists using:
```bash
curl -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  https://admin.serverhub.biz/api/v1/dashboard/stats/
```

Expected: 200 OK with JSON response
Currently: 404 Not Found

