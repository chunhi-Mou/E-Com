export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-sheet" aria-hidden>
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2 p-3">
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-3/5" />
        <div className="skeleton mt-3 h-5 w-2/5" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

export function GridSkeleton({ n = 12, cols = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" }: { n?: number; cols?: string }) {
  return (
    <div className={`grid gap-3 md:gap-4 ${cols}`} role="status" aria-label="Đang tải sản phẩm">
      {Array.from({ length: n }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
