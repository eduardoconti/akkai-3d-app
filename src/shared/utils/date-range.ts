export function getMonthStartInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function getMonthEndInput(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
  ).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
