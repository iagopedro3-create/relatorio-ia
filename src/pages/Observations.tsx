import { useMemo, useRef, useState } from 'react';
import { NotebookPen, Camera, Users, Share2, Trash2, Pencil, Check, X, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listClassRoster, listObservations, createObservation, updateObservation, deleteObservation, uploadObservationPhoto, signObservationPhotos } from '../data';
import { OBSERVATION_FIELDS, FIELD_BY_ID } from '../store/bnccFields';
import { periodRange, periodIndexForDate } from '../lib/periods';
import { formatDate } from '../lib/format';
import { Badge, EmptyState, PageHeader, SkeletonCard, useConfirm } from '../components/ui';
import type { Observation } from '../types/db';

/**
 * Documentação pedagógica contínua: a professora registra em 20 segundos o
 * que observou (texto curto, campo da BNCC, foto opcional), para uma ou
 * várias crianças. Esses registros alimentam o relatório e o PEI.
 */
export function Observations() {
  const { user } = useAuth();
  const { school, classes, staff, selectedYear, grading } = useSchool();
  const askConfirm = useConfirm();
  const [chosenClassId, setChosenClassId] = useState('');
  const classId = classes.some(c => c.id === chosenClassId) ? chosenClassId : (classes[0]?.id ?? '');
  const cls = classes.find(c => c.id === classId);

  const periodCount = grading.periods.length;
  const [periodIdx, setPeriodIdx] = useState(() => periodIndexForDate(selectedYear, periodCount));
  const range = periodRange(selectedYear, periodCount, periodIdx);

  const rosterQ = useAsync(() => classId ? listClassRoster(classId) : Promise.resolve([]), [classId], []);
  const obsQ = useAsync(() => (school && classId) ? listObservations({ schoolId: school.id, classId, from: range.start, to: range.end }) : Promise.resolve([]), [school?.id, classId, range.start, range.end], []);
  const photosQ = useAsync(() => signObservationPhotos(obsQ.data.map(o => o.photo_path ?? '')), [obsQ.data.map(o => o.photo_path).join(',')], {} as Record<string, string>);

  // Formulário de captura rápida.
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [fieldId, setFieldId] = useState('general');
  const [text, setText] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [share, setShare] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filtros da lista.
  const [filterStudent, setFilterStudent] = useState('');
  const [filterField, setFilterField] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string; share: boolean } | null>(null);

  const students = useMemo(() => rosterQ.data.map(r => r.student).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [rosterQ.data]);
  const nameOf = (id: string) => students.find(s => s.id === id)?.name ?? '—';
  const firstName = (id: string) => nameOf(id).split(' ')[0];
  const authorOf = (id: string | null) => staff.find(u => u.id === id)?.name?.split(' ')[0] ?? '';

  const coverage = useMemo(() => students.map(s => ({ student: s, count: obsQ.data.filter(o => o.student_id === s.id).length })), [students, obsQ.data]);
  const visible = useMemo(() => obsQ.data.filter(o => (!filterStudent || o.student_id === filterStudent) && (!filterField || o.field_id === filterField)), [obsQ.data, filterStudent, filterField]);

  const toggleStudent = (id: string) => setStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const save = async () => {
    if (!school || !user) return;
    if (studentIds.length === 0) { toast.error('Escolha pelo menos uma criança.'); return; }
    if (!text.trim()) { toast.error('Escreva o que você observou.'); return; }
    setSaving(true);
    try {
      let photo_path: string | null = null;
      if (photo) photo_path = await uploadObservationPhoto(school.id, classId, photo);
      for (const student_id of studentIds) {
        await createObservation({ school_id: school.id, student_id, class_id: classId || null, author_id: user.id, date, field_id: fieldId, text: text.trim(), photo_path, share_with_family: share });
      }
      await obsQ.reload();
      toast.success(studentIds.length === 1 ? `Registro salvo para ${firstName(studentIds[0])}.` : `Registro salvo para ${studentIds.length} crianças.`);
      setText(''); setPhoto(null); setStudentIds([]); setShare(false);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (o: Observation) => {
    if (!(await askConfirm({ title: 'Excluir este registro?', description: 'Ele deixa de alimentar o relatório e some do portal da família.', danger: true }))) return;
    try { await deleteObservation(o.id); await obsQ.reload(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    try { await updateObservation(editing.id, { text: editing.text.trim(), share_with_family: editing.share }); setEditing(null); await obsQ.reload(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Falha.'); }
  };

  const canEdit = (o: Observation) => user?.role === 'admin' || user?.role === 'coordinator' || o.author_id === user?.id;

  return (
    <div>
      <PageHeader
        icon={<NotebookPen size={22} />}
        title="Registros de observação"
        subtitle="Anote o que viu, quando viu. No fim do bimestre, o relatório nasce daqui — não de uma folha em branco."
      />

      <div className="card flex items-center gap-4 flex-wrap mb-6" style={{ padding: '0.75rem 1rem' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Turma</span>
          <select value={classId} onChange={e => setChosenClassId(e.target.value)} style={{ width: 'auto', padding: '0.4rem 0.6rem' }}>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Período</span>
          <select value={periodIdx} onChange={e => setPeriodIdx(Number(e.target.value))} style={{ width: 'auto', padding: '0.4rem 0.6rem' }}>
            {grading.periods.map((p, i) => <option key={p} value={i}>{p}</option>)}
          </select>
          <span className="text-muted mobile-hide" style={{ fontSize: '0.8rem' }}>{formatDate(range.start)} – {formatDate(range.end)}</span>
        </div>
      </div>

      {!cls && <div className="card"><EmptyState icon={<Users size={36} />} title="Nenhuma turma" description="Você precisa estar vinculado(a) a uma turma para registrar observações." /></div>}

      {cls && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            {/* Captura rápida */}
            <div className="card card-accent mb-6">
              <h3 style={{ fontSize: '1rem', margin: '0 0 0.75rem' }}>Novo registro · {cls.name}</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Para quem? (toque para marcar várias)</p>
              {rosterQ.loading ? <SkeletonCard lines={2} className="border-none p-0" /> : (
                <div className="flex flex-wrap gap-2 mb-4">
                  {students.map(s => {
                    const on = studentIds.includes(s.id);
                    return <button key={s.id} type="button" onClick={() => toggleStudent(s.id)} className="badge" style={{ cursor: 'pointer', textTransform: 'none', fontSize: '0.82rem', padding: '0.4rem 0.75rem', background: on ? 'var(--color-primary)' : 'var(--color-border-soft)', color: on ? 'white' : 'var(--color-text)', border: 'none', fontFamily: 'inherit' }}>{s.name.split(' ')[0]}</button>;
                  })}
                  {students.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStudentIds(studentIds.length === students.length ? [] : students.map(s => s.id))}>{studentIds.length === students.length ? 'Limpar' : 'Toda a turma'}</button>}
                  {students.length === 0 && <span className="text-muted" style={{ fontSize: '0.85rem' }}>Turma sem alunos matriculados.</span>}
                </div>
              )}
              <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Campo de experiência</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {OBSERVATION_FIELDS.map(f => (
                  <button key={f.id} type="button" onClick={() => setFieldId(f.id)} className="badge" title={f.label} style={{ cursor: 'pointer', textTransform: 'none', fontSize: '0.78rem', padding: '0.35rem 0.7rem', background: fieldId === f.id ? 'var(--color-text)' : 'var(--color-surface-2)', color: fieldId === f.id ? 'white' : 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontFamily: 'inherit' }}>{f.short}</button>
                ))}
              </div>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder='Ex.: "Hoje pediu a palavra na roda e contou do passeio com o avô. Esperou a vez dos colegas."' style={{ minHeight: '84px' }} />
              <div className="flex items-center gap-3 flex-wrap mt-3">
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 'auto', padding: '0.4rem 0.6rem' }} />
                <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={e => setPhoto(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}><Camera size={16} /> {photo ? photo.name.slice(0, 18) : 'Foto'}</button>
                {photo && <button type="button" className="btn btn-ghost" onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; }} title="Remover foto"><X size={16} /></button>}
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} /> <Share2 size={14} /> Mostrar à família
                </label>
                <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} disabled={saving} onClick={() => void save()}><Check size={16} /> {saving ? 'Salvando…' : 'Salvar registro'}</button>
              </div>
            </div>

            {/* Lista */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                <option value="">Todas as crianças</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={filterField} onChange={e => setFilterField(e.target.value)} style={{ width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                <option value="">Todos os campos</option>
                {OBSERVATION_FIELDS.map(f => <option key={f.id} value={f.id}>{f.short}</option>)}
              </select>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>{visible.length} registro(s) no período</span>
            </div>
            {obsQ.loading ? <SkeletonCard lines={3} /> : visible.length === 0 ? (
              <div className="card"><EmptyState icon={<NotebookPen size={36} />} title="Nenhum registro neste período" description="Comece pelo formulário acima — uma frase por observação já basta." /></div>
            ) : (
              <div className="flex flex-col gap-3">
                {visible.map(o => {
                  const f = FIELD_BY_ID[o.field_id];
                  const url = o.photo_path ? photosQ.data[o.photo_path] : undefined;
                  const isEditing = editing?.id === o.id;
                  return (
                    <div key={o.id} className="card" style={{ padding: '1rem' }}>
                      <div className="flex justify-between items-start gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{ fontWeight: 600 }}>{nameOf(o.student_id)}</span>
                          {f && <Badge tone={f.tone}>{f.short}</Badge>}
                          {o.share_with_family && <Badge tone="primary"><Share2 size={11} /> família</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>{formatDate(o.date)}{authorOf(o.author_id) ? ` · ${authorOf(o.author_id)}` : ''}</span>
                          {canEdit(o) && !isEditing && <button className="btn btn-ghost" onClick={() => setEditing({ id: o.id, text: o.text, share: o.share_with_family })} title="Editar"><Pencil size={14} /></button>}
                          {canEdit(o) && <button className="btn btn-ghost danger" onClick={() => void remove(o)} title="Excluir"><Trash2 size={14} /></button>}
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="mt-2">
                          <textarea value={editing.text} onChange={e => setEditing({ ...editing, text: e.target.value })} rows={3} />
                          <div className="flex items-center gap-3 mt-2">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '0.85rem', fontWeight: 500 }}><input type="checkbox" checked={editing.share} onChange={e => setEditing({ ...editing, share: e.target.checked })} /> Mostrar à família</label>
                            <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setEditing(null)}>Cancelar</button>
                            <button className="btn btn-primary btn-sm" onClick={() => void saveEdit()}><Check size={14} /> Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.92rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{o.text}</p>
                      )}
                      {o.photo_path && (url
                        ? <img src={url} alt="" style={{ marginTop: '0.75rem', maxHeight: 260, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                        : <div className="flex items-center gap-2 text-muted mt-2" style={{ fontSize: '0.8rem' }}><ImageOff size={14} /> foto indisponível</div>)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cobertura: quem ainda não tem registro no período */}
          <div>
            <div className="card">
              <h3 style={{ fontSize: '1rem', margin: '0 0 0.25rem' }}>Cobertura do período</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Registros por criança em {grading.periods[periodIdx]}. Quem está em zero vai chegar ao relatório sem evidência.</p>
              {rosterQ.loading ? <SkeletonCard lines={5} className="border-none p-0" /> : (
                <div className="flex flex-col gap-1">
                  {coverage.sort((a, b) => a.count - b.count || a.student.name.localeCompare(b.student.name, 'pt-BR')).map(({ student, count }) => (
                    <button key={student.id} type="button" onClick={() => setFilterStudent(filterStudent === student.id ? '' : student.id)} className="flex items-center justify-between w-full text-left bg-transparent border-none cursor-pointer rounded-md px-2 py-1.5 hover:bg-[var(--color-surface-2)]" style={{ fontFamily: 'inherit', fontSize: '0.88rem', background: filterStudent === student.id ? 'var(--color-primary-soft)' : undefined }}>
                      <span style={{ fontWeight: 500 }}>{student.name}</span>
                      <Badge tone={count === 0 ? 'danger' : count < 3 ? 'warning' : 'success'}>{count}</Badge>
                    </button>
                  ))}
                  {coverage.length === 0 && <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>Sem alunos na turma.</p>}
                </div>
              )}
            </div>
            <div className="callout callout-info mt-4">
              <NotebookPen size={16} />
              <span>Na hora do relatório, a ficha da criança já vem com estes registros por campo. Quanto mais concreto ("montou torre de 10 peças"), melhor o texto.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
