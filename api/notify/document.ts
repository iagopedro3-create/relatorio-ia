import { adminClient, authenticate, body, handler, HttpError, requireProfile } from '../_lib/supabase.js';

/**
 * Avisa por e-mail quem precisa saber que um documento (relatório ou PEI)
 * mudou de status:
 *   submitted → coordenação/direção da escola (do segmento da turma)
 *   returned  → autor(a), com o comentário da coordenação
 *   approved  → autor(a) e responsáveis da criança
 *
 * Chamado pelo front logo depois da mudança (best-effort). Sem RESEND_API_KEY
 * o endpoint só calcula os destinatários e devolve `skipped: 'no-key'` — nada
 * quebra em ambientes sem e-mail. Nenhum conteúdo do documento vai no e-mail:
 * só o tipo, o primeiro nome da criança, o status e o link para entrar.
 */

interface Body { documentId: string }

const KIND_LABEL: Record<string, string> = { report: 'relatório descritivo', pei: 'PEI' };

function firstName(full: string | null | undefined): string {
  return (full ?? '').trim().split(/\s+/)[0] || 'a criança';
}

async function sendEmail(to: string[], subject: string, text: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM || 'Althion Education <notificacoes@althioneduapp.vercel.app>';
  if (!key) return { ok: false, error: 'no-key' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) return { ok: false, error: `resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: json.id };
}

export default handler(['POST'], async (req) => {
  const caller = await authenticate(req);
  const profile = requireProfile(caller);
  const { documentId } = body<Body>(req);
  if (!documentId) throw new HttpError(400, 'documentId ausente.');

  const db = adminClient();
  const { data: doc } = await db
    .from('student_documents')
    .select('id, school_id, student_id, class_id, kind, period, status, author_id, review_note')
    .eq('id', documentId).maybeSingle();
  if (!doc || doc.school_id !== profile.school_id) throw new HttpError(404, 'Documento não encontrado.');

  const [{ data: school }, { data: student }, { data: cls }] = await Promise.all([
    db.from('schools').select('name').eq('id', doc.school_id).maybeSingle(),
    db.from('students').select('name').eq('id', doc.student_id).maybeSingle(),
    doc.class_id ? db.from('classes').select('level').eq('id', doc.class_id).maybeSingle() : Promise.resolve({ data: null as { level: string } | null }),
  ]);

  const recipients = new Map<string, string>(); // id → email
  const addProfiles = async (ids: string[]) => {
    if (ids.length === 0) return;
    const { data } = await db.from('profiles').select('id, email').eq('school_id', doc.school_id).eq('active', true).in('id', ids);
    for (const p of (data ?? []) as { id: string; email: string }[]) if (p.email) recipients.set(p.id, p.email);
  };

  if (doc.status === 'submitted') {
    const { data } = await db.from('profiles').select('id, email, role, managed_level').eq('school_id', doc.school_id).eq('active', true).in('role', ['admin', 'coordinator']);
    for (const p of (data ?? []) as { id: string; email: string; role: string; managed_level: string | null }[]) {
      if (p.role === 'coordinator' && p.managed_level && cls?.level && p.managed_level !== cls.level) continue;
      if (p.email) recipients.set(p.id, p.email);
    }
  } else if (doc.status === 'returned' || doc.status === 'approved') {
    if (doc.author_id) await addProfiles([doc.author_id]);
    if (doc.status === 'approved') {
      const { data: links } = await db.from('student_guardians').select('profile_id').eq('student_id', doc.student_id);
      await addProfiles((links ?? []).map(l => (l as { profile_id: string }).profile_id));
    }
  } else {
    return { sent: 0, skipped: 'status-sem-notificacao' };
  }
  // Quem fez a ação não precisa ser avisado dela.
  recipients.delete(profile.id);

  const kind = KIND_LABEL[doc.kind] ?? 'documento';
  const child = firstName(student?.name);
  const appUrl = process.env.APP_URL || 'https://althioneduapp.vercel.app';
  const schoolName = school?.name ?? 'sua escola';
  let subject: string;
  let text: string;
  if (doc.status === 'submitted') {
    subject = `[${schoolName}] ${kind} de ${child} aguardando revisão`;
    text = `Olá!\n\nUm ${kind}${doc.period ? ` (${doc.period})` : ''} de ${child} foi enviado para revisão.\n\nEntre para revisar: ${appUrl}\n\n— ${schoolName} · Althion Education`;
  } else if (doc.status === 'returned') {
    subject = `[${schoolName}] ${kind} de ${child} devolvido com orientações`;
    text = `Olá!\n\nA coordenação devolveu o ${kind}${doc.period ? ` (${doc.period})` : ''} de ${child} para ajustes.${doc.review_note ? `\n\nComentário da coordenação:\n${doc.review_note}` : ''}\n\nEntre para ajustar e reenviar: ${appUrl}\n\n— ${schoolName} · Althion Education`;
  } else {
    subject = `[${schoolName}] ${kind} de ${child} aprovado`;
    text = `Olá!\n\nO ${kind}${doc.period ? ` (${doc.period})` : ''} de ${child} foi aprovado pela coordenação e já está disponível no portal.\n\nEntre para ler: ${appUrl}\n\n— ${schoolName} · Althion Education`;
  }

  const to = Array.from(recipients.values());
  if (to.length === 0) return { sent: 0, skipped: 'sem-destinatarios' };

  const result = await sendEmail(to, subject, text);
  await db.from('audit_log').insert({
    school_id: doc.school_id, actor_id: profile.id, action: 'notification.document',
    entity: 'student_document', entity_id: doc.id,
    data: { status: doc.status, recipients: to.length, ok: result.ok, error: result.error ?? null },
  });
  if (!result.ok) return { sent: 0, skipped: result.error, recipients: to.length };
  return { sent: to.length };
});
