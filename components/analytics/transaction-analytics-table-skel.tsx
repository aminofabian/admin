export function TransactionAnalyticsTableSkel() {
  return (
    <div className="p-5 space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-7 h-7 rounded-lg bg-muted/30 shrink-0" />
          <div className="flex-1 h-3 bg-muted/20 rounded" />
          <div className="w-16 h-3 bg-muted/30 rounded" />
        </div>
      ))}
    </div>
  );
}
