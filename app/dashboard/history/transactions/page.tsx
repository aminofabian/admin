export default function HistoryTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
        <p className="text-muted-foreground">
          View completed and cancelled transactions
        </p>
      </div>
      {/* TODO: Implement transaction history table */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <p className="text-muted-foreground">Transaction history implementation coming soon...</p>
        </div>
      </div>
    </div>
  );
}

