import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, User, CalendarDays, ShieldCheck, X } from 'lucide-react';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { getStudent, listEnrollmentsOfStudent, getClassesByIds, listDocuments } from '../data';
import type { ClassGroup, StudentDocument } from '../types/db';
import { formatDate, calcAge } from '../lib/format';

const STATUS_LABEL: Record<StudentDocument['status'], { label: string; bg: string; color: string }> = {
  draft: { label: 'Rascunho', bg: 'var(--color-border-soft)', color: 'var(--color-text-muted)' },
  submitted: { label: 'Aguardando visto', bg: 'var(--color-warning-soft)', color: 'var(--color-warning-text)' },
  approved: { label: 'Aprovado', bg: 'var(--color-success-soft)', color: 'var(--color-success-text)' },
  returned: { label: 'Devolvido', bg: 'var(--color-danger-soft)', color: 'var(--color-danger-text)' },
};

export function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { school, staff, classes, selectedYear } = useSchool();
  const [open, setOpen] = useState<StudentDocument | null>(null);

  const studentQ = useAsync(() => id ? getStudent(id) : Promise.resolve(null), [id], null);
  const enrollQ = useAsync(() => id ? listEnrollmentsOfStudent(id) : Promise.resolve([]), [id], []);
  const docsQ = useAsync(() => (school && id) ? listDocuments({ schoolId: school.id, studentId: id }) : Promise.resolve([]), [school?.id, id], []);
  const otherClassIds = useMemo(() => enrollQ.data.map(e => e.class_id).filter(cid => !classes.some(c => c.id === cid)), [enrollQ.data, classes]);
  const otherClassesQ = useAsync(() => getClassesByIds(otherClassIds), [otherClassIds.join(',')], [] as ClassGroup[]);

  const allClasses = useMemo(() => [...classes, ...otherClassesQ.data], [classes, otherClassesQ.data]);
  const student = studentQ.data;
  const currentEnrollment = enrollQ.data.find(e => e.active && classes.some(c => c.id === e.class_id));
  const studentClass = allClasses.find(c => c.id === currentEnrollment?.class_id);

  if (studentQ.loading) return <div className="card text-center"><p className="text-muted">Carregando...</p></div>;

  if (!student) {
    return (
      <div className="card p-12 text-center">
        <User size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
        <h2>Aluno não encontrado</h2>
        <button className="btn btn-secondary mt-4" onClick={() => navigate('/students')}>Voltar para Lista</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
          <ArrowLeft size={20} color="var(--color-text-muted)" />
        </button>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={24} color="var(--color-primary)" /> Perfil Escolar do Aluno
          </h2>
          <p className="text-muted">Histórico de matrículas, relatórios e PEI</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="card p-6" style={{ borderTop: '4px solid var(--color-primary)' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-border)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, margin: '0 auto 1rem' }}>
              {student.name.charAt(0)}
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', textAlign: 'center', fontSize: '1.25rem' }}>{student.name}</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem', fontSize: '0.85rem' }}>
              {[
                ['Turma atual', studentClass?.name ?? `Sem turma em ${selectedYear?.label ?? ''}`],
                ['Nascimento', `${formatDate(student.birth_date)} (${calcAge(student.birth_date)})`],
                ['Responsável 1', student.guardian1 ?? '—'],
                ...(student.guardian2 ? [['Responsável 2', student.guardian2]] : []),
                ...(student.cpf ? [['CPF', student.cpf]] : []),
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--color-border-soft)', paddingBottom: '0.5rem' }}>
                  <span className="text-muted">{k}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
            {student.notes && <p className="text-muted mt-4" style={{ fontSize: '0.85rem' }}><strong>Obs.:</strong> {student.notes}</p>}
          </div>

          <div className="card p-5" style={{ backgroundColor: student.pei_consent_at ? 'var(--color-success-soft)' : 'var(--color-warning-soft)', border: `1px solid ${student.pei_consent_at ? 'var(--color-success-border)' : 'var(--color-warning-border)'}` }}>
            <h4 style={{ color: student.pei_consent_at ? 'var(--color-success-text)' : 'var(--color-warning-text)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={18} /> LGPD · Consentimento para PEI
            </h4>
            <p style={{ fontSize: '0.85rem', margin: 0, color: student.pei_consent_at ? 'var(--color-success-text)' : 'var(--color-warning-text)' }}>
              {student.pei_consent_at
                ? `Registrado em ${new Date(student.pei_consent_at).toLocaleDateString('pt-BR')}${student.pei_consent_by ? ` por ${student.pei_consent_by}` : ''}.`
                : 'Não registrado. O PEI só pode ser gerado após o responsável autorizar o tratamento de dados de saúde.'}
            </p>
          </div>

          <div className="card p-5">
            <h4 className="mb-3 flex items-center gap-2"><CalendarDays size={18} color="var(--color-primary)" /> Matrículas</h4>
            {enrollQ.data.length === 0 && <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>Nenhuma matrícula.</p>}
            {enrollQ.data.map(e => {
              const c = allClasses.find(x => x.id === e.class_id);
              return (
                <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.4rem 0', borderBottom: '1px solid var(--color-border-soft)' }}>
                  <span style={{ fontWeight: 600 }}>{c?.name ?? 'Turma removida'}</span>
                  <span className="text-muted">{e.active ? 'ativa' : 'encerrada'}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-0" style={{ overflow: 'hidden' }}>
            <div className="p-5 border-b border-slate-200" style={{ backgroundColor: 'var(--color-surface-2)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={20} color="var(--color-primary)" /> Linha do Tempo Pedagógica
              </h3>
            </div>
            <div className="p-6">
              {docsQ.data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-subtle)' }}>
                  <FileText size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p>Nenhum relatório ou PEI registrado para este aluno ainda.</p>
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '1rem' }}>
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: '23px', width: '2px', backgroundColor: 'var(--color-border)' }} />
                  {docsQ.data.map((doc, idx) => {
                    const author = staff.find(u => u.id === doc.author_id);
                    const st = STATUS_LABEL[doc.status];
                    return (
                      <div key={doc.id} style={{ position: 'relative', marginBottom: idx === docsQ.data.length - 1 ? 0 : '2rem', paddingLeft: '2.5rem' }}>
                        <div style={{ position: 'absolute', left: '-5px', top: '4px', width: '14px', height: '14px', borderRadius: '50%', backgroundColor: doc.kind === 'pei' ? 'var(--color-secondary)' : 'var(--color-primary)', border: '3px solid white', boxShadow: '0 0 0 1px var(--color-border-strong)' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '1rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text)' }}>{doc.kind === 'pei' ? 'PEI' : 'Relatório descritivo'}{doc.period ? ` · ${doc.period}` : ''}</h4>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', backgroundColor: 'var(--color-border-soft)', padding: '0.2rem 0.6rem', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                            {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <div style={{ backgroundColor: 'var(--color-surface-2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                            <span><strong>Autor(a):</strong> {author?.name ?? '—'}</span>
                            <span style={{ padding: '0.1rem 0.5rem', borderRadius: '4px', backgroundColor: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
                          </div>
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-text)', lineHeight: 1.6, margin: 0, fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {doc.content || '(sem texto)'}
                          </p>
                          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-strong)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => setOpen(doc)}>
                              <FileText size={14} /> Ver completo
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }} onClick={() => setOpen(null)}>
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ margin: 0 }}>{open.kind === 'pei' ? 'PEI' : 'Relatório descritivo'}{open.period ? ` · ${open.period}` : ''}</h3>
              <button onClick={() => setOpen(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-subtle)' }}><X size={20} /></button>
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.95rem' }}>{open.content}</div>
          </div>
        </div>
      )}
    </div>
  );
}
