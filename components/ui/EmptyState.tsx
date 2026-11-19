export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-brand-100 bg-brand-50 px-4 py-10 text-center text-brand-700">
      {message}
    </p>
  );
}
