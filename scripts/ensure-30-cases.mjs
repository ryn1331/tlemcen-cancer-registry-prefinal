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

const targetCases = 30;
const cancerTypes = ['Poumon', 'Sein', 'Colorectal', 'Prostate', 'Vessie', 'Foie', 'Thyroïde', 'Col utérin'];
const codes = ['C34', 'C50', 'C18', 'C61', 'C67', 'C22', 'C73', 'C53'];
const stages = ['I', 'II', 'IIA', 'IIB', 'III', 'IIIA', 'IIIB'];

async function getCount(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

function diagnosisDate(index) {
  const year = 2023 + (index % 3);
  const month = (index % 12) + 1;
  const day = ((index * 2) % 27) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function main() {
  const currentCases = await getCount('cancer_cases');
  if (currentCases >= targetCases) {
    console.log(`cancer_cases already >= ${targetCases} (current: ${currentCases})`);
    return;
  }

  const { data: patients, error: pErr } = await supabase
    .from('patients')
    .select('id')
    .order('created_at', { ascending: true });
  if (pErr) throw pErr;

  const { data: existingCases, error: cErr } = await supabase
    .from('cancer_cases')
    .select('patient_id');
  if (cErr) throw cErr;

  const usedPatientIds = new Set((existingCases || []).map((c) => c.patient_id));
  const availablePatients = (patients || []).filter((p) => !usedPatientIds.has(p.id));

  let needed = targetCases - currentCases;
  const rows = [];

  for (let i = 0; i < availablePatients.length && needed > 0; i++) {
    const t = i % cancerTypes.length;
    rows.push({
      patient_id: availablePatients[i].id,
      type_cancer: cancerTypes[t],
      code_icdo: codes[t],
      stade_tnm: stages[i % stages.length],
      date_diagnostic: diagnosisDate(i),
      resultat_anapath: 'Confirmation histologique',
      statut: i % 4 === 0 ? 'en_attente' : 'valide',
      milieu: i % 2 === 0 ? 'Urbain' : 'Rural',
      methode_diagnostic: i % 2 === 0 ? 'Biopsie' : 'Histologie',
      notes: 'Cas généré pour démonstration',
    });
    needed -= 1;
  }

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from('cancer_cases').insert(rows);
    if (insErr) throw insErr;
  }

  const finalCount = await getCount('cancer_cases');
  console.log(`cancer_cases final count: ${finalCount}`);
}

main().catch((err) => {
  console.error('ensure-30-cases failed:', err?.message || err);
  process.exit(1);
});
