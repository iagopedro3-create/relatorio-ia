import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, X, CheckCircle2, AlertCircle, Plus, Search, Baby, User, Edit2, Trash2, Upload, Download, FileSpreadsheet, AlertTriangle, ShieldCheck } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSchool } from '../contexts/SchoolContext';
import { useAsync } from '../lib/useAsync';
import { listStudents, listEnrollments, createStudent, updateStudent, deleteStudent, enrollStudent, importStudents } from '../data';
import type { Student, ClassGroup } from '../types/db';
import { formatDate, calcAge } from '../lib/format';

function ageAtCutoff(birthDate: string, year: number): number {
  if (!birthDate) return -1;
  const bd = new Date(birthDate + 'T00:00:00');
  const cutoff = new Date(year, 2, 31); // corte de 31 de março
  let age = year - bd.getFullYear();
  const thisYearBirthday = new Date(year, bd.getMonth(), bd.getDate());
  if (thisYearBirthday > cutoff) age--;
  return age;
}

interface FormState {
  name: string;
  birth_date: string;
  class_id: string;
  guardian1: string;
  guardian2: string;
  cpf: string;
  notes: string;
  pei_consent: boolean;
  pei_consent_by: string;
}

const EMPTY: FormState = { name: '', birth_date: '', class_id: '', guardian1: '', guardian2: '', cpf: '', notes: '', pei_consent: false, pei_consent_by: '' };

interface ImportRow { name: string; birth_date: string | null; guardian1: string | null; guardian2: string | null; class_id: string | null }

export function StudentManagement() {
  const { user } = useAuth();
  const { school, classes, selectedYear, grading } = useSchool();
  const navigate = useNavigate();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [dateInputText, setDateInputText] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importClassId, setImportClassId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const managedClasses = useMemo(() => {
    if (user?.role === 'coordinator' && user.managed_level) return classes.filter(c => c.level === user.managed_level);
    return classes;
  }, [user, classes]);

  const classIds = useMemo(() => managedClasses.map(c => c.id), [managedClasses]);
  const yearLabel = selectedYear ? parseInt(selectedYear.label, 10) || new Date().getFullYear() : new Date().getFullYear();

  const studentsQ = useAsync(() => school ? listStudents(school.id) : Promise.resolve([] as Student[]), [school?.id], [] as Student[]);
  const enrollQ = useAsync(() => listEnrollments(classIds), [classIds.join(',')], []);

  const enrollmentByStudent = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of enrollQ.data) map.set(e.student_id, e.class_id);
    return map;
  }, [enrollQ.data]);

  const displayed = useMemo(() => {
    return studentsQ.data.filter(s => {
      const cid = enrollmentByStudent.get(s.id);
      const matchClass = filterClass ? cid === filterClass : true;
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      return matchClass && matchSearch;
    });
  }, [studentsQ.data, enrollmentByStudent, search, filterClass]);

  // Série sugerida pela idade no corte: 1 ano = primeira série do infantil, e por aí vai.
  const suggestSeries = useCallback((birthDate: string): string | null => {
    const age = ageAtCutoff(birthDate, yearLabel);
    const ladder = [...grading.series.infantil, ...grading.series.fundamental];
    return ladder[age - 1] ?? null;
  }, [grading, yearLabel]);

  const handleBirthDate = (val: string) => {
    const series = suggestSeries(val);
    setSuggestion(series);
    const match = series ? managedClasses.find(c => c.series === series) : undefined;
    setForm(f => ({ ...f, birth_date: val, class_id: match ? match.id : f.class_id }));
  };

  const handleBirthDateInput = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
    if (v.length > 5) v = v.substring(0, 5) + '/' + v.substring(5, 9);
    setDateInputText(v);
    if (v.length === 10) {
      const [d, m, y] = v.split('/');
      handleBirthDate(`${y}-${m}-${d}`);
    } else {
      setForm(f => ({ ...f, birth_date: '' }));
      setSuggestion(null);
    }
  };

  const reloadAll = async () => { await Promise.all([studentsQ.reload(), enrollQ.reload()]); };

  const handleSave = async () => {
    if (!school) return;
    if (!form.name.trim() || !form.birth_date || !form.guardian1.trim()) {
      toast.error('Preencha nome, data de nascimento e responsável 1.');
      return;
    }
    setSaving(true);
    try {
      const consentPatch = form.pei_consent
        ? { pei_consent_at: editingId && studentsQ.data.find(s => s.id === editingId)?.pei_consent_at ? undefined : new Date().toISOString(), pei_consent_by: form.pei_consent_by.trim() || user?.name || null }
        : { pei_consent_at: null, pei_consent_by: null };
      const payload = {
        name: form.name.trim(),
        birth_date: form.birth_date,
        guardian1: form.guardian1.trim(),
        guardian2: form.guardian2.trim() || null,
        cpf: form.cpf.trim() || null,
        notes: form.notes.trim() || null,
        ...consentPatch,
      };
      let studentId = editingId;
      if (editingId) {
        await updateStudent(editingId, payload);
      } else {
        const created = await createStudent({ ...payload, school_id: school.id });
        studentId = created.id;
      }
      if (studentId && form.class_id && enrollmentByStudent.get(studentId) !== form.class_id) {
        await enrollStudent(school.id, studentId, form.class_id, classes.map(c => c.id));
      }
      await reloadAll();
      toast.success(editingId ? 'Aluno atualizado.' : 'Aluno cadastrado.');
      setForm(EMPTY);
      setSuggestion(null);
      setIsAdding(false);
      setEditingId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Student) => {
    setForm({
      name: s.name,
      birth_date: s.birth_date ?? '',
      class_id: enrollmentByStudent.get(s.id) ?? '',
      guardian1: s.guardian1 ?? '',
      guardian2: s.guardian2 ?? '',
      cpf: s.cpf ?? '',
      notes: s.notes ?? '',
      pei_consent: Boolean(s.pei_consent_at),
      pei_consent_by: s.pei_consent_by ?? '',
    });
    setDateInputText(formatDate(s.birth_date));
    setSuggestion(s.birth_date ? suggestSeries(s.birth_date) : null);
    setEditingId(s.id);
    setIsAdding(true);
  };

  const handleDelete = async (s: Student) => {
    if (!window.confirm(`Excluir ${s.name}? Frequência, notas e relatórios do aluno serão apagados.`)) return;
    try {
      await deleteStudent(s.id);
      await reloadAll();
      toast.success('Aluno excluído.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao excluir.');
    }
  };

  const openNew = () => { setForm(EMPTY); setDateInputText(''); setSuggestion(null); setEditingId(null); setIsAdding(true); };

  const suggestedClass = managedClasses.find(c => c.series === suggestion);

  // ---- IMPORTAÇÃO ----
  const handleDownloadTemplate = () => {
    const wsData = [
      ['Nome Completo', 'Data de Nascimento (DD/MM/AAAA)', 'Responsável 1', 'Responsável 2'],
      ['João da Silva', '15/03/2018', 'Sra. Maria da Silva', 'Sr. João da Silva'],
      ['Ana Santos', '22/07/2019', 'Sra. Paula Santos', ''],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 28 }, { wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
    XLSX.writeFile(wb, 'modelo_importacao_alunos.xlsx');
  };

  const parseDateBR = (val: string): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const num = Number(val);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      return new Date((num - 25569) * 86400000).toISOString().split('T')[0];
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const workbook = XLSX.read(evt.target?.result, { type: 'binary' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
        const rows = jsonData.slice(1).filter(row => row.length > 0 && row[0]);
        const errors: string[] = [];
        const parsed: ImportRow[] = [];
        rows.forEach((row, idx) => {
          const name = String(row[0] || '').trim();
          const birthRaw = String(row[1] || '').trim();
          const guardian1 = String(row[2] || '').trim();
          const guardian2 = String(row[3] || '').trim();
          if (!name) { errors.push(`Linha ${idx + 2}: Nome em branco`); return; }
          const birth_date = parseDateBR(birthRaw);
          if (!birth_date) { errors.push(`Linha ${idx + 2}: Data inválida "${birthRaw}" para ${name}`); return; }
          if (!guardian1) { errors.push(`Linha ${idx + 2}: Responsável 1 em branco para ${name}`); return; }
          const series = suggestSeries(birth_date);
          const class_id = series ? managedClasses.find(c => c.series === series)?.id ?? null : null;
          parsed.push({ name, birth_date, guardian1, guardian2: guardian2 || null, class_id });
        });
        setImportPreview(parsed);
        setImportErrors(errors);
        setShowImportModal(true);
      } catch {
        toast.error('Erro ao ler o arquivo. Verifique se é um Excel (.xlsx) ou CSV válido.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!school) return;
    if (importPreview.some(r => !r.class_id) && !importClassId) {
      toast.error('Selecione uma turma padrão para os alunos sem turma sugerida.');
      return;
    }
    setSaving(true);
    try {
      // Agrupa por turma para inserir em lote.
      const byClass = new Map<string, ImportRow[]>();
      for (const r of importPreview) {
        const cid = r.class_id ?? importClassId;
        byClass.set(cid, [...(byClass.get(cid) ?? []), r]);
      }
      let total = 0;
      for (const [cid, rows] of byClass) {
        total += await importStudents(school.id, rows.map(({ name, birth_date, guardian1, guardian2 }) => ({ name, birth_date, guardian1, guardian2 })), cid);
      }
      await reloadAll();
      toast.success(`${total} aluno(s) importado(s).`);
      setShowImportModal(false);
      setImportPreview([]);
      setImportErrors([]);
      setImportClassId('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na importação.');
    } finally {
      setSaving(false);
    }
  };

  const classOf = (s: Student): ClassGroup | undefined => classes.find(c => c.id === enrollmentByStudent.get(s.id));

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} style={{ display: 'none' }} />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Cadastro de Alunos</h2>
          <p className="text-muted">{displayed.length} aluno{displayed.length !== 1 ? 's' : ''} · {selectedYear?.label ?? ''}</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-secondary" onClick={handleDownloadTemplate} title="Baixar modelo de planilha" style={{ width: '38px', height: '38px', padding: 0, border: '1px solid var(--color-border)', color: '#64748b', background: 'white', boxShadow: 'none' }}>
            <Download size={18} />
          </button>
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Importar Planilha
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <UserPlus size={18} /> Novo Aluno
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="card mb-6 p-6" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 style={{ margin: 0 }}>{editingId ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem' }}>Nome Completo <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" placeholder="Ex: João da Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem' }}>Data de Nascimento <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" placeholder="DD/MM/AAAA" value={dateInputText} onChange={e => handleBirthDateInput(e.target.value)} maxLength={10} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem' }}>Responsável 1 <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" placeholder="Ex: Sra. Maria" value={form.guardian1} onChange={e => setForm(f => ({ ...f, guardian1: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem' }}>Responsável 2 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opcional)</span></label>
              <input type="text" placeholder="Ex: Sr. João" value={form.guardian2} onChange={e => setForm(f => ({ ...f, guardian2: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem' }}>CPF <span style={{ color: '#94a3b8', fontWeight: 400 }}>(para o histórico escolar)</span></label>
              <input type="text" placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem' }}>Observações internas</label>
              <input type="text" placeholder="Ex: alergia, restrição alimentar" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          {form.birth_date && suggestion && (
            <div style={{ padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', backgroundColor: suggestedClass ? '#eff6ff' : '#fefce8', border: `1px solid ${suggestedClass ? '#bfdbfe' : '#fde68a'}`, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {suggestedClass ? <CheckCircle2 size={18} color="#2563eb" /> : <AlertCircle size={18} color="#d97706" />}
              <div style={{ fontSize: '0.85rem', color: suggestedClass ? '#1e40af' : '#92400e' }}>
                <strong>Sugestão pela data de nascimento:</strong> {suggestion}
                {suggestedClass ? ` → turma selecionada: ${suggestedClass.name}` : ' (sem turma nesta série)'}
              </div>
            </div>
          )}

          <div style={{ maxWidth: '320px' }}>
            <label style={{ fontSize: '0.85rem' }}>Turma em {selectedYear?.label}</label>
            <select value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Sem turma</option>
              {managedClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level === 'infantil' ? 'Infantil' : 'Fundamental'})</option>)}
            </select>
          </div>

          {/* LGPD: consentimento para dado sensível (PEI) */}
          <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}>
              <input type="checkbox" checked={form.pei_consent} onChange={e => setForm(f => ({ ...f, pei_consent: e.target.checked }))} style={{ marginTop: '0.2rem' }} />
              <span>
                <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                <strong>Consentimento LGPD para PEI:</strong> o responsável autorizou, por escrito, o tratamento de dados de saúde/diagnóstico
                da criança para elaboração do Plano Educacional Individualizado. Sem isso o PEI fica bloqueado.
              </span>
            </label>
            {form.pei_consent && (
              <input type="text" placeholder="Nome de quem assinou o termo" value={form.pei_consent_by} onChange={e => setForm(f => ({ ...f, pei_consent_by: e.target.value }))} style={{ marginTop: '0.75rem', maxWidth: '360px' }} />
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Plus size={18} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Aluno'}
            </button>
          </div>
        </div>
      )}

      <div className="card mb-4 p-4" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input type="text" placeholder="Buscar por nome..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: '0.9rem', padding: 0 }} />
        </div>
        <select value={filterClass} onChange={e => setFilterClass(e.target.value)} style={{ width: '200px', fontSize: '0.85rem' }}>
          <option value="">Todas as turmas</option>
          {managedClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {(search || filterClass) && (
          <button onClick={() => { setSearch(''); setFilterClass(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <X size={14} /> Limpar
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Aluno</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Nascimento</th>
                <th style={{ padding: '1rem', textAlign: 'center' }}>Idade</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Responsável(is)</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Turma</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {studentsQ.loading && (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Carregando...</td></tr>
              )}
              {!studentsQ.loading && displayed.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    <Baby size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
              {displayed.map((s, i) => {
                const cls = classOf(s);
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '1rem' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>{s.name.charAt(0)}</span>
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.name}</span>
                        {s.pei_consent_at && <ShieldCheck size={14} color="#10b981" aria-label="Consentimento PEI registrado" />}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>{formatDate(s.birth_date)}</td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: '#f1f5f9', fontWeight: 600 }}>{calcAge(s.birth_date)}</span>
                    </td>
                    <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                      {s.guardian1}{s.guardian2 && <span><br />{s.guardian2}</span>}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {cls ? (
                        <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.7rem', borderRadius: '6px', fontWeight: 600, backgroundColor: cls.level === 'infantil' ? '#fdf4ff' : '#eff6ff', color: cls.level === 'infantil' ? '#7e22ce' : '#1d4ed8' }}>{cls.name}</span>
                      ) : <span className="text-muted" style={{ fontSize: '0.8rem' }}>Sem turma</span>}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => navigate(`/students/${s.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '0.4rem' }} title="Perfil"><User size={16} /></button>
                        <button onClick={() => handleEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.4rem' }} title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => void handleDelete(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.4rem' }} title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '850px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.6rem', borderRadius: '10px' }}><FileSpreadsheet size={22} color="var(--color-primary)" /></div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Importar Alunos via Planilha</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{importPreview.length} aluno(s) encontrado(s) no arquivo</p>
                </div>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem' }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
              {importErrors.length > 0 && (
                <div style={{ padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#991b1b' }}>{importErrors.length} linha(s) ignorada(s):</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.8rem', color: '#b91c1c' }}>{importErrors.map((err, i) => <li key={i}>{err}</li>)}</ul>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.85rem' }}>Turma padrão (para alunos sem turma sugerida)</label>
                <select value={importClassId} onChange={e => setImportClassId(e.target.value)} style={{ maxWidth: '400px' }}>
                  <option value="">Selecione...</option>
                  {managedClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level === 'infantil' ? 'Infantil' : 'Fundamental'})</option>)}
                </select>
              </div>

              {importPreview.length > 0 ? (
                <div style={{ borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '40px' }}>#</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Nome</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Nascimento</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Responsável 1</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Responsável 2</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Turma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((s, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.6rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#64748b' }}>{formatDate(s.birth_date)}</td>
                          <td style={{ padding: '0.6rem 1rem', color: '#64748b' }}>{s.guardian1}</td>
                          <td style={{ padding: '0.6rem 1rem', color: '#94a3b8' }}>{s.guardian2 || '—'}</td>
                          <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                            {s.class_id
                              ? <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 700 }}>{managedClasses.find(c => c.id === s.class_id)?.name}</span>
                              : <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}>turma padrão</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <FileSpreadsheet size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  <p>Nenhum aluno válido encontrado no arquivo.</p>
                </div>
              )}
            </div>

            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} style={{ fontSize: '0.85rem' }}><Upload size={16} /> Outro Arquivo</button>
              <div className="flex gap-3">
                <button className="btn btn-secondary" onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={() => void handleConfirmImport()} disabled={importPreview.length === 0 || saving}>
                  <CheckCircle2 size={18} /> Importar {importPreview.length} Aluno(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
