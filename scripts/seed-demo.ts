/**
 * Cria uma escola de demonstração completa (admin, coordenação, professores,
 * responsável, turmas, alunos, ano letivo) usando a service_role.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/seed-demo.ts [slug]
 *
 * Idempotente por slug: se a escola já existir, não faz nada.
 * Senha de todos os usuários de demo: Demo@2026
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const slug = process.argv[2] ?? 'escola-demo';
const PASSWORD = 'Demo@2026';

async function user(email: string, name: string) {
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { name } });
  if (error) throw error;
  return data.user!.id;
}

async function main() {
  const { data: existing } = await db.from('schools').select('id').eq('slug', slug).maybeSingle();
  if (existing) { console.log(`Escola "${slug}" já existe (${existing.id}). Nada a fazer.`); return; }

  const { data: school, error: sErr } = await db.from('schools').insert({
    slug, name: 'Escola Demo', legal_name: 'Escola Demo Ltda', cnpj: '00.000.000/0001-00', city: 'São Paulo', uf: 'SP',
    plan_id: 'trial', status: 'trial', trial_ends_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    branding: { tagline: 'Educação com propósito', colors: { primary: '#0a73ff', secondary: '#fd852d', accent: '#ffcb64', bg: '#f4f6fb' } },
  }).select('*').single();
  if (sErr || !school) throw sErr;
  const sid = school.id as string;

  const yearLabel = String(new Date().getFullYear());
  const { data: year } = await db.from('school_years').insert({ school_id: sid, label: yearLabel, active: true }).select('*').single();

  const mk = async (email: string, name: string, role: string, extra: Record<string, unknown> = {}) => {
    const id = await user(`${email}@${slug}.demo`, name);
    await db.from('profiles').insert({ id, school_id: sid, name, email: `${email}@${slug}.demo`, role, ...extra });
    return id;
  };

  await mk('diretora', 'Diretora Ana', 'admin');
  await mk('coord.infantil', 'Coord. Carla (Infantil)', 'coordinator', { managed_level: 'infantil' });
  await mk('coord.fund', 'Coord. Pedro (Fundamental)', 'coordinator', { managed_level: 'fundamental' });
  const profInf = await mk('prof.infantil', 'Profa. Maria', 'teacher');
  const profFund = await mk('prof.fund', 'Prof. João', 'teacher');
  const profIng = await mk('prof.ingles', 'Prof. Marcos (Inglês)', 'teacher', { specialty: 'english' });
  const pai = await mk('pai', 'Sr. Marcos (responsável)', 'guardian');

  const classes = [
    { name: 'MATERNAL II A', series: 'Maternal II', letter: 'A', level: 'infantil', evaluation_type: 'report', homeroom_teacher_id: profInf },
    { name: 'JARDIM II A', series: 'Jardim II', letter: 'A', level: 'infantil', evaluation_type: 'report' },
    { name: '1º ANO A', series: '1º Ano', letter: 'A', level: 'fundamental', evaluation_type: 'report' },
    { name: '2º ANO A', series: '2º Ano', letter: 'A', level: 'fundamental', evaluation_type: 'numeric', homeroom_teacher_id: profFund },
    { name: '3º ANO A', series: '3º Ano', letter: 'A', level: 'fundamental', evaluation_type: 'numeric' },
  ];
  const { data: createdClasses } = await db.from('classes').insert(classes.map(c => ({ ...c, school_id: sid, year_id: year!.id }))).select('*');
  const cls = (name: string) => createdClasses!.find(c => c.name === name)!.id as string;

  await db.from('teacher_assignments').insert([cls('2º ANO A'), cls('3º ANO A')].map(class_id => ({ school_id: sid, teacher_id: profIng, class_id, subject_id: 'ing' })));

  const students = [
    ['Lucas Silva', '2023-02-10', 'Sr. Marcos', 'MATERNAL II A'],
    ['Marina Souza', '2023-08-22', 'Sra. Alice', 'MATERNAL II A'],
    ['Beatriz Lima', '2021-11-03', 'Sr. Roberto', 'JARDIM II A'],
    ['Ana Carvalho', '2019-01-15', 'Sra. Renata', '1º ANO A'],
    ['Sofia Ramos', '2018-07-08', 'Sra. Fernanda', '2º ANO A'],
    ['Mateus Costa', '2018-02-17', 'Sr. André', '2º ANO A'],
    ['Isabela Ferreira', '2018-10-30', 'Sra. Camila', '2º ANO A'],
    ['Rafael Oliveira', '2017-04-12', 'Sr. Bruno', '3º ANO A'],
    ['Laura Santos', '2017-09-05', 'Sra. Marcia', '3º ANO A'],
  ] as const;
  const { data: created } = await db.from('students').insert(students.map(([name, birth_date, guardian1]) => ({ school_id: sid, name, birth_date, guardian1 }))).select('*');
  await db.from('enrollments').insert(students.map(([name, , , className]) => ({
    school_id: sid, student_id: created!.find(s => s.name === name)!.id, class_id: cls(className),
  })));
  await db.from('student_guardians').insert({ school_id: sid, student_id: created!.find(s => s.name === 'Lucas Silva')!.id, profile_id: pai });
  await db.from('students').update({ pei_consent_at: new Date().toISOString(), pei_consent_by: 'Sr. Marcos' }).eq('id', created!.find(s => s.name === 'Lucas Silva')!.id);

  await db.from('agenda_events').insert([
    { school_id: sid, title: 'Reunião de Pais', description: '1º período', date: `${yearLabel}-03-15`, time: '18:30', type: 'reuniao' },
    { school_id: sid, title: 'Feriado — Tiradentes', date: `${yearLabel}-04-21`, type: 'feriado' },
    { school_id: sid, title: 'Festa Junina', date: `${yearLabel}-06-20`, time: '17:00', type: 'evento' },
  ]);

  console.log(`Escola "${slug}" criada (${sid}).`);
  console.log(`Logins (senha ${PASSWORD}):`);
  for (const e of ['diretora', 'coord.infantil', 'coord.fund', 'prof.infantil', 'prof.fund', 'prof.ingles', 'pai']) console.log(`  ${e}@${slug}.demo`);
}

main().catch(e => { console.error(e); process.exit(1); });
