import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const usersToCreate = [
  {
    email: 'admin@chu.fr',
    password: '12345678',
    fullName: 'Admin Registre',
    role: 'admin',
    service: 'Administration',
    specialite: 'Gestion',
  },
  {
    email: 'medecin@chu.fr',
    password: '12345678',
    fullName: 'Dr. Medecin CHU',
    role: 'medecin',
    service: 'Oncologie',
    specialite: 'Oncologie médicale',
  },
  {
    email: 'epidemiologiste@chu.fr',
    password: '12345678',
    fullName: 'Dr. Epidemiologiste CHU',
    role: 'epidemiologiste',
    service: 'Épidémiologie',
    specialite: 'Santé publique',
  },
  {
    email: 'anapath@chu.fr',
    password: '12345678',
    fullName: 'Dr. Anatomopathologiste CHU',
    role: 'anapath',
    service: 'Anatomopathologie',
    specialite: 'Anapath',
  },
  {
    email: 'assistante@chu.fr',
    password: '12345678',
    fullName: 'Assistante Médicale CHU',
    role: 'assistante',
    service: 'Accueil',
    specialite: 'Coordination',
  },
];

async function ensureUser(user) {
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: {
      full_name: user.fullName,
      role: user.role,
    },
  });

  if (createError && !String(createError.message || '').toLowerCase().includes('already')) {
    throw createError;
  }

  let authUser = createData?.user || null;

  if (!authUser) {
    const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    authUser = (listData?.users || []).find((u) => u.email?.toLowerCase() === user.email.toLowerCase()) || null;
  }

  if (!authUser) {
    throw new Error(`Unable to create/find user ${user.email}`);
  }

  const userId = authUser.id;

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        full_name: user.fullName,
        service: user.service,
        specialite: user.specialite,
      },
      { onConflict: 'user_id' }
    );
  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert(
      {
        user_id: userId,
        role: user.role,
      },
      { onConflict: 'user_id,role' }
    );
  if (roleError) throw roleError;

  return userId;
}

async function getCount(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count || 0;
}

async function hardResetDemoDataAndUsers() {
  const tablesInOrder = [
    'case_comments',
    'patient_files',
    'cancer_rechutes',
    'traitements',
    'rendez_vous',
    'cancer_cases',
    'patients',
    'user_roles',
    'profiles',
  ];

  for (const table of tablesInOrder) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error && !String(error.message || '').toLowerCase().includes('relation')) {
      throw error;
    }
  }

  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    if (!users.length) break;

    for (const user of users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw deleteError;
    }

    if (users.length < 200) break;
    page += 1;
  }
}

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

async function seedDomainData(adminUserId) {
  const patientsCount = await getCount('patients');
  if (patientsCount === 0) {
    const patients = [
      { code_patient: 'PAT-0001', nom: 'Benali', prenom: 'Ahmed', date_naissance: '1972-04-15', sexe: 'M', wilaya: 'Tlemcen', commune: 'Tlemcen', telephone: '0550000001', num_dossier: 'DOSS-1001', created_by: adminUserId },
      { code_patient: 'PAT-0002', nom: 'Kadi', prenom: 'Samira', date_naissance: '1980-11-03', sexe: 'F', wilaya: 'Tlemcen', commune: 'Maghnia', telephone: '0550000002', num_dossier: 'DOSS-1002', created_by: adminUserId },
      { code_patient: 'PAT-0003', nom: 'Mansouri', prenom: 'Yacine', date_naissance: '1964-07-28', sexe: 'M', wilaya: 'Tlemcen', commune: 'Nedroma', telephone: '0550000003', num_dossier: 'DOSS-1003', created_by: adminUserId },
      { code_patient: 'PAT-0004', nom: 'Benaissa', prenom: 'Imane', date_naissance: '1990-01-12', sexe: 'F', wilaya: 'Tlemcen', commune: 'Ghazaouet', telephone: '0550000004', num_dossier: 'DOSS-1004', created_by: adminUserId },
      { code_patient: 'PAT-0005', nom: 'Zerrouki', prenom: 'Karim', date_naissance: '1959-09-06', sexe: 'M', wilaya: 'Tlemcen', commune: 'Remchi', telephone: '0550000005', num_dossier: 'DOSS-1005', created_by: adminUserId },
      { code_patient: 'PAT-0006', nom: 'Ait', prenom: 'Nadia', date_naissance: '1978-02-20', sexe: 'F', wilaya: 'Tlemcen', commune: 'Sebdou', telephone: '0550000006', num_dossier: 'DOSS-1006', created_by: adminUserId },
    ];

    const { error } = await supabase.from('patients').insert(patients);
    if (error) throw error;
  }

  const { data: patients, error: patientsError } = await supabase
    .from('patients')
    .select('id, code_patient, sexe')
    .order('code_patient', { ascending: true });
  if (patientsError) throw patientsError;

  const patientByCode = Object.fromEntries((patients || []).map((p) => [p.code_patient, p]));

  const casesCount = await getCount('cancer_cases');
  if (casesCount === 0) {
    const cancerCases = [
      { patient_id: patientByCode['PAT-0001']?.id, type_cancer: 'Poumon', code_icdo: 'C34', stade_tnm: 'IIIA', date_diagnostic: '2024-03-10', statut: 'valide', resultat_anapath: 'Adénocarcinome', created_by: adminUserId, milieu: 'Urbain', methode_diagnostic: 'Histologie' },
      { patient_id: patientByCode['PAT-0002']?.id, type_cancer: 'Sein', code_icdo: 'C50', stade_tnm: 'IIB', date_diagnostic: '2024-05-22', statut: 'valide', resultat_anapath: 'Carcinome canalaire infiltrant', created_by: adminUserId, milieu: 'Urbain', methode_diagnostic: 'Biopsie' },
      { patient_id: patientByCode['PAT-0003']?.id, type_cancer: 'Colorectal', code_icdo: 'C18', stade_tnm: 'III', date_diagnostic: '2023-11-01', statut: 'valide', resultat_anapath: 'Adénocarcinome colique', created_by: adminUserId, milieu: 'Rural', methode_diagnostic: 'Endoscopie + histologie' },
      { patient_id: patientByCode['PAT-0004']?.id, type_cancer: 'Thyroïde', code_icdo: 'C73', stade_tnm: 'I', date_diagnostic: '2025-01-18', statut: 'en_attente', resultat_anapath: 'Carcinome papillaire', created_by: adminUserId, milieu: 'Urbain', methode_diagnostic: 'Cytoponction' },
      { patient_id: patientByCode['PAT-0005']?.id, type_cancer: 'Prostate', code_icdo: 'C61', stade_tnm: 'II', date_diagnostic: '2024-08-07', statut: 'valide', resultat_anapath: 'Adénocarcinome acinaire', created_by: adminUserId, milieu: 'Rural', methode_diagnostic: 'Biopsie' },
      { patient_id: patientByCode['PAT-0006']?.id, type_cancer: 'Col utérin', code_icdo: 'C53', stade_tnm: 'II', date_diagnostic: '2024-10-15', statut: 'valide', resultat_anapath: 'Carcinome épidermoïde', created_by: adminUserId, milieu: 'Rural', methode_diagnostic: 'Biopsie' },
    ].filter((row) => !!row.patient_id);

    const { error } = await supabase.from('cancer_cases').insert(cancerCases);
    if (error) throw error;
  }

  const { data: cases, error: casesError } = await supabase
    .from('cancer_cases')
    .select('id, patient_id, type_cancer')
    .order('date_diagnostic', { ascending: true });
  if (casesError) throw casesError;

  const traitementsCount = await getCount('traitements');
  if (traitementsCount === 0 && (cases || []).length > 0) {
    const traitements = (cases || []).map((c, i) => ({
      case_id: c.id,
      type_traitement: i % 2 === 0 ? 'Chimiothérapie' : 'Chirurgie',
      date_debut: i % 2 === 0 ? '2024-04-01' : '2024-06-01',
      date_fin: i % 2 === 0 ? '2024-09-15' : null,
      protocole: i % 2 === 0 ? 'Protocol FOLFOX' : 'Résection chirurgicale',
      efficacite: i % 3 === 0 ? 'Réponse complète' : 'Réponse partielle',
      effets_secondaires: i % 2 === 0 ? 'Nausées grade 1' : 'Douleur postopératoire',
      medecin_traitant: 'Dr. Medecin CHU',
      created_by: adminUserId,
    }));
    const { error } = await supabase.from('traitements').insert(traitements);
    if (error) throw error;
  }

  const rdvCount = await getCount('rendez_vous');
  if (rdvCount === 0 && (cases || []).length > 0) {
    const rdv = (cases || []).slice(0, 6).map((c, i) => ({
      patient_id: c.patient_id,
      case_id: c.id,
      titre: i % 2 === 0 ? 'Consultation de suivi' : 'RCP oncologie',
      date_rdv: dateOffset(3 + i),
      duree_minutes: i % 2 === 0 ? 30 : 45,
      type_rdv: i % 2 === 0 ? 'consultation' : 'controle',
      lieu: 'CHU Tlemcen',
      medecin: 'Dr. Medecin CHU',
      statut: 'planifie',
      created_by: adminUserId,
    }));
    const { error } = await supabase.from('rendez_vous').insert(rdv);
    if (error) throw error;
  }

  const commentsCount = await getCount('case_comments');
  if (commentsCount === 0 && (cases || []).length > 0) {
    const comments = (cases || []).slice(0, 4).map((c, i) => ({
      case_id: c.id,
      user_id: adminUserId,
      content: i % 2 === 0 ? 'Discussion RCP: poursuite du protocole.' : 'Validation des données cliniques effectuée.',
    }));
    const { error } = await supabase.from('case_comments').insert(comments);
    if (error) throw error;
  }

  const rechutesCount = await getCount('cancer_rechutes');
  if (rechutesCount === 0 && (cases || []).length > 0) {
    const rechutes = (cases || []).slice(0, 2).map((c, i) => ({
      case_id: c.id,
      type_evenement: i === 0 ? 'progression' : 'rechute',
      date_evenement: i === 0 ? '2025-01-10' : '2025-02-15',
      localisation: i === 0 ? 'Pulmonaire' : 'Ganglionnaire',
      description: 'Évolution clinique documentée lors du suivi.',
      stade_tnm: i === 0 ? 'IIIB' : 'III',
      traitement_propose: 'Réévaluation thérapeutique en RCP',
      created_by: adminUserId,
    }));
    const { error } = await supabase.from('cancer_rechutes').insert(rechutes);
    if (error) throw error;
  }
}

async function main() {
  console.log('Seeding users, roles, and domain tables...');

  if (process.env.RESET_DEMO === 'true') {
    console.log('RESET_DEMO=true -> deleting existing users and demo data first...');
    await hardResetDemoDataAndUsers();
  }

  const createdUserIds = {};
  for (const user of usersToCreate) {
    const id = await ensureUser(user);
    createdUserIds[user.role] = id;
  }

  const adminUserId = createdUserIds.admin;
  if (!adminUserId) {
    throw new Error('Admin user creation failed.');
  }

  await seedDomainData(adminUserId);

  const summaryTables = ['patients', 'cancer_cases', 'traitements', 'rendez_vous', 'case_comments', 'cancer_rechutes', 'profiles', 'user_roles'];
  for (const table of summaryTables) {
    const count = await getCount(table);
    console.log(`${table}: ${count}`);
  }

  console.log('Seed completed successfully.');
}

main().catch((err) => {
  console.error('Seed failed:', err?.message || err);
  process.exit(1);
});
