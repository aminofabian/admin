# Game Activity Components - Usage Guide

This guide explains how to use the refactored game activity components that are now reusable across your application.

## Components Overview

### 1. `GameActivityTable`
A reusable table component that displays game activities with full customization options.

### 2. `GameActivityModal`
An example modal wrapper that demonstrates how to use `GameActivityTable` in a modal context.

---

## Component: `GameActivityTable`

### Purpose
Display a table of game activities (recharge, redeem, add user, etc.) with configurable features for different use cases.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `activities` | `TransactionQueue[]` | **Required** | Array of game activities to display |
| `onViewDetails` | `(activity: TransactionQueue) => void` | `undefined` | Callback when "View Details" is clicked |
| `showActions` | `boolean` | `true` | Whether to show the actions column |
| `actionLoading` | `boolean` | `false` | Whether actions are in a loading state |
| `compact` | `boolean` | `false` | Use compact mode (future enhancement) |
| `className` | `string` | `''` | Additional CSS classes |

### Usage Examples

#### Example 1: Basic Usage in a Page
```tsx
import { GameActivityTable } from '@/components/dashboard/data-sections';
import { useTransactionQueuesStore } from '@/stores';

function MyGameActivityPage() {
  const queues = useTransactionQueuesStore((state) => state.queues);
  
  const handleViewActivity = (activity: TransactionQueue) => {
    console.log('View activity:', activity);
    // Open a details modal, navigate to a page, etc.
  };

  return (
    <div>
      <h1>Game Activities</h1>
      <GameActivityTable
        activities={queues ?? []}
        onViewDetails={handleViewActivity}
      />
    </div>
  );
}
```

#### Example 2: Without Action Buttons
```tsx
<GameActivityTable
  activities={activities}
  showActions={false}
  className="my-custom-class"
/>
```

#### Example 3: With Loading State
```tsx
<GameActivityTable
  activities={activities}
  onViewDetails={handleViewActivity}
  actionLoading={isProcessing}
/>
```

---

## Component: `GameActivityModal`

### Purpose
A modal wrapper that demonstrates how to use `GameActivityTable` in a modal context. This is a reference implementation you can customize.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | `boolean` | **Required** | Whether the modal is open |
| `onClose` | `() => void` | **Required** | Callback to close the modal |
| `activities` | `TransactionQueue[]` | **Required** | Activities to display |
| `onViewDetails` | `(activity: TransactionQueue) => void` | `undefined` | Callback for viewing activity details |
| `title` | `string` | `'Game Activities'` | Modal title |
| `description` | `string` | `'View and manage...'` | Modal description |

### Usage Examples

#### Example 1: Basic Modal Usage
```tsx
import { GameActivityModal } from '@/components/dashboard/data-sections';
import { useState } from 'react';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activities, setActivities] = useState<TransactionQueue[]>([]);

  const handleOpenModal = () => {
    // Fetch or filter activities
    setActivities(someActivities);
    setIsModalOpen(true);
  };

  const handleViewDetails = (activity: TransactionQueue) => {
    console.log('Viewing:', activity);
  };

  return (
    <>
      <button onClick={handleOpenModal}>
        View Game Activities
      </button>

      <GameActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        activities={activities}
        onViewDetails={handleViewDetails}
        title="Recent Game Activities"
        description="View the latest game activities from the past 24 hours"
      />
    </>
  );
}
```

#### Example 2: Filtered Activities in Modal
```tsx
function UserGameActivitiesModal({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queues = useTransactionQueuesStore((state) => state.queues);
  
  // Filter activities for specific user
  const userActivities = useMemo(() => 
    queues?.filter(q => q.user_id === userId) ?? [],
    [queues, userId]
  );

  return (
    <GameActivityModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      activities={userActivities}
      title={`Activities for User ${userId}`}
    />
  );
}
```

---

## Integration Points

### Current Usage
The `GameActivityTable` is currently used in:
- **Processing Section** (`processing-section.tsx`): Displays pending game activities with real-time WebSocket updates

### Future Usage Examples

#### 1. User Profile Page
```tsx
// Show user's game activity history
<GameActivityTable
  activities={userGameActivities}
  onViewDetails={handleViewActivity}
/>
```

#### 2. Dashboard Widget
```tsx
// Show recent 5 activities
<GameActivityTable
  activities={recentActivities.slice(0, 5)}
  showActions={false}
  compact={true}
/>
```

#### 3. Reports Page
```tsx
// Display filtered activities
<GameActivityTable
  activities={filteredActivities}
  onViewDetails={openReportDetails}
/>
```

---

## Customization

### Extending the Component
If you need additional features, you can:

1. **Add new props** to `GameActivityTableProps`
2. **Customize the row rendering** in `GameActivityRow`
3. **Add new columns** by modifying the table structure
4. **Create variant components** that wrap `GameActivityTable`

### Example: Custom Row Actions
```tsx
// Create a wrapper with custom actions
function GameActivityTableWithCustomActions({ 
  activities, 
  onApprove, 
  onReject 
}: CustomProps) {
  return (
    <GameActivityTable
      activities={activities}
      onViewDetails={(activity) => {
        // Custom logic before viewing
        console.log('Custom action');
      }}
    />
  );
}
```

---

## Data Flow

```
Store (useTransactionQueuesStore)
  ↓
Parent Component
  ↓ (activities array)
GameActivityTable
  ↓ (onViewDetails callback)
Parent Component (handles action)
```

---

## Best Practices

1. **Always handle the `onViewDetails` callback** - Even if you don't need it immediately, it makes the component more flexible.

2. **Use memoization for filtered data** - If you're filtering or transforming activities before passing to the table:
   ```tsx
   const filteredActivities = useMemo(() => 
     activities.filter(/* your filter */),
     [activities]
   );
   ```

3. **Show loading states** - Pass `actionLoading={true}` when processing actions to prevent double-clicks.

4. **Provide empty states** - Always handle the case when `activities` is empty.

5. **Wrap in error boundaries** - The table component doesn't handle errors, so wrap it in an error boundary if needed.

---

## Migration Notes

If you're updating existing code that used the old `ProcessingGameActivityRow`:

**Before:**
```tsx
{queues.map((queue) => (
  <ProcessingGameActivityRow
    key={queue.id}
    queue={queue}
    actionLoading={actionLoading}
    onQuickAction={handleQuickAction}
  />
))}
```

**After:**
```tsx
<GameActivityTable
  activities={queues}
  onViewDetails={handleViewDetails}
  actionLoading={actionLoading}
/>
```

---

## TypeScript Types

```typescript
// Main activity type
import type { TransactionQueue } from '@/types';

// Component prop types
import type { GameActivityTableProps } from './game-activity-table';
import type { GameActivityModalProps } from './game-activity-modal';
```

---

## Questions?

If you need to customize these components further or have questions about usage, refer to:
- The component source code for implementation details
- The existing usage in `processing-section.tsx` for a complete example
- The TypeScript types for available props and data structures

