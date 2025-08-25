export function generateNumber(prefix: string) {
  const year = new Date().getFullYear();
  const suffix = Math.floor(Math.random() * 90000) + 10000; // 5-digit suffix
  return `${prefix}/${year}/${suffix}`;
}

export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
