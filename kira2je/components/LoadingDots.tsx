export function LoadingDots({ className = 'text-ink-secondary' }: { className?: string }) {
  return (
    <span className={`dot-flashing inline-flex items-center gap-1 ${className}`}>
      <span />
      <span />
      <span />
    </span>
  );
}
