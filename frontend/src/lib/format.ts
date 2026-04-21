export function rm(value: number | string | null | undefined, showPlus = false): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (n === null || n === undefined || isNaN(n as number)) return '—';
  const formatted = (n as number).toLocaleString('en-MY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = (n as number) >= 0 ? (showPlus ? '+' : '') : '−';
  return `${sign}RM${formatted.replace('-', '')}`;
}

export function scoreLabelMs(score: string): string {
  switch (score) {
    case 'green':
      return 'Sihat';
    case 'yellow':
      return 'Perhati';
    case 'red':
      return 'Rugi';
    default:
      return score;
  }
}
