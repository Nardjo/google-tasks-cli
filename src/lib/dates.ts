/** Google Tasks stores due as a date. Time is discarded. */
export function toDueTimestamp(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}. Use YYYY-MM-DD.`);
  }
  const day = parsed.toISOString().slice(0, 10);
  return `${day}T00:00:00.000Z`;
}

export function listItems(data: unknown): { items: Record<string, unknown>[]; nextPageToken?: string } {
  if (!data || typeof data !== "object") return { items: [] };
  const record = data as { items?: Record<string, unknown>[]; nextPageToken?: string };
  return { items: record.items ?? [], nextPageToken: record.nextPageToken };
}
