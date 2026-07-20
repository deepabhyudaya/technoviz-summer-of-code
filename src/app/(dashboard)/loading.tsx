export default function DashboardLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col gap-3 w-full max-w-2xl px-8 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-lg" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="mt-4 grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
