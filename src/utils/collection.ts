export function replaceRecordById<T extends { id: string }>(records: readonly T[], replacement: T): T[] {
  const index = records.findIndex((record) => record.id === replacement.id);
  if (index < 0) {
    throw new Error(`Record '${replacement.id}' was not found.`);
  }

  return records.map((record) => (record.id === replacement.id ? replacement : record));
}
