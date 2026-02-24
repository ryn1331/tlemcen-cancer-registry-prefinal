import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const targetPatients = 30;
const wilaya = 'Tlemcen';
const communes = ['Tlemcen', 'Maghnia', 'Nedroma', 'Ghazaouet', 'Remchi', 'Sebdou', 'Oujda', 'Hennaya', 'Mansourah', 'Beni Snous'];
const firstNamesM = ['Ahmed', 'Yacine', 'Karim', 'Riad', 'Samir', 'Nabil', 'Fares', 'Walid', 'Adel', 'Anis', 'Mourad', 'Ilyes', 'Hakim', 'Youcef', 'Khaled'];
const firstNamesF = ['Samira', 'Imane', 'Nadia', 'Lina', 'Amel', 'Yasmine', 'Khadidja', 'Sonia', 'Meriem', 'Salima', 'Nour', 'Sabrina', 'Asma', 'Nassima', 'Rym'];
const lastNames = ['Benali', 'Kadi', 'Mansouri', 'Benaissa', 'Zerrouki', 'Ait', 'Boukhalfa', 'Meziane', 'Bensaid', 'Guerfi', 'Boudiaf', 'Benaouda', 'Rahmani', 'Bouziane', 'Haddad'];

function pad(value, size) {
  return String(value).padStart(size, '0');
}

function randomBirthDate(index) {
  const year = 1955 + (index % 45);
  const month = (index % 12) + 1;
  const day = (index % 27) + 1;
  return `${year}-${pad(month, 2)}-${pad(day, 2)}`;
}

function buildPatient(index) {
  const sexe = index % 2 === 0 ? 'M' : 'F';
  const firstNamePool = sexe === 'M' ? firstNamesM : firstNamesF;
  const prenom = firstNamePool[index % firstNamePool.length];
  const nom = lastNames[(index * 3) % lastNames.length];
  const commune = communes[index % communes.length];

  return {
    code_patient: `PAT-${pad(1000 + index, 4)}`,
    nom,
    prenom,
    date_naissance: randomBirthDate(index),
    sexe,
    wilaya,
    commune,
    adresse: `${commune}, ${wilaya}`,
    telephone: `0551${pad(100000 + index, 6)}`,
    num_dossier: `DOSS-${2000 + index}`,
  };
}

async function main() {
  const { count: currentCount, error: countError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;

  const existing = currentCount || 0;
  if (existing >= targetPatients) {
    console.log(`patients already >= ${targetPatients} (current: ${existing})`);
    return;
  }

  const needed = targetPatients - existing;
  const rows = Array.from({ length: needed }, (_, i) => buildPatient(existing + i + 1));

  const { error: insertError } = await supabase.from('patients').insert(rows);
  if (insertError) throw insertError;

  const { count: finalCount, error: finalCountError } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true });

  if (finalCountError) throw finalCountError;
  console.log(`patients final count: ${finalCount || 0}`);
}

main().catch((err) => {
  console.error('ensure-30-patients failed:', err?.message || err);
  process.exit(1);
});
