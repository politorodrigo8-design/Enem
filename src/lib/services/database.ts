export const databaseAdapterStatus = {
  provider: "Supabase PostgreSQL",
  readyFor: ["Row Level Security", "Supabase Auth", "queries server-side", "migrations SQL"],
};

export async function getMockRecord<T>(record: T) {
  await new Promise((resolve) => setTimeout(resolve, 120));
  return record;
}
