export function Logo({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const bg = variant === 'dark' ? 'bg-primary' : 'bg-transparent';
  const text = variant === 'dark' ? 'text-accent' : 'text-primary';
  return (
    <div className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 ${bg}`}>
      <span className="h-2 w-2 rounded-full bg-accent" />
      <span className={`font-serif text-xl font-bold ${text}`}>Kira2Lah</span>
    </div>
  );
}
