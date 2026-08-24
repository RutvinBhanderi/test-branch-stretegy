import { PointsBadge } from "@greenback/ui";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Greenback Cash</h1>
      <p className="text-sm text-gray-600">Foundation scaffold - replace this page.</p>
      <PointsBadge points={0} />
    </main>
  );
}
