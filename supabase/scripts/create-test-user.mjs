// Cria (ou atualiza) o usuário de teste local com acesso admin.
// Uso: node supabase/scripts/create-test-user.mjs <SUPABASE_URL> <SERVICE_ROLE_KEY> <EMAIL> <SENHA>
import { createClient } from "@supabase/supabase-js";

const [url, serviceKey, email, password] = process.argv.slice(2);
if (!url || !serviceKey || !email || !password) {
  console.error("Uso: node create-test-user.mjs <url> <service_key> <email> <senha>");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Guilherme Milreu" },
});

let userId = created?.user?.id;
if (createError) {
  if (!/already/i.test(createError.message)) {
    console.error("Erro ao criar usuário:", createError.message);
    process.exit(1);
  }
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error("Erro ao listar usuários:", listError.message);
    process.exit(1);
  }
  const existing = list.users.find((u) => u.email === email);
  if (!existing) {
    console.error("Usuário existente não encontrado.");
    process.exit(1);
  }
  userId = existing.id;
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (updateError) {
    console.error("Erro ao atualizar senha:", updateError.message);
    process.exit(1);
  }
}

const { error: profileError } = await admin
  .from("profiles")
  .upsert(
    {
      id: userId,
      full_name: "Guilherme Milreu",
      access_level: "admin",
      access_expires_at: null,
    },
    { onConflict: "id" },
  );

if (profileError) {
  console.error("Erro ao configurar perfil:", profileError.message);
  process.exit(1);
}

console.log(`OK: ${email} pronto (id ${userId}, access_level=admin).`);
