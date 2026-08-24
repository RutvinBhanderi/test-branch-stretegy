interface PointsBadgeProps {
  points: number;
}

/**
 * Example shared component - proves the apps/web <-> packages/ui workspace wiring
 * works end to end. Replace/extend once real UI work starts.
 */
export function PointsBadge({ points }: PointsBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
      {points.toLocaleString()} pts
    </span>
  );
}
