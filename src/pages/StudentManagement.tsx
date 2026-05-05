import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, X, CheckCircle2, AlertCircle, Plus, Search, Baby, User, Edit2, Trash2, Upload, Download, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useYear } from '../contexts/YearContext';
import { mockStudents, mockClasses, mockEnrollments } from '../store/mockDb';
import type { Student, ClassGroup, Enrollment } from '../store/mockDb';
import * as XLSX from 'xlsx';

function ageAtCutoff(birthDate: string, year: number): number {
  if (!birthDate) return -1;
  const bd = new Date(birthDate);
  const cutoff = new Date(year, 2, 31); // March 31
  let age = year - bd.getFullYear();
  const thisYearBirthday = new Date(year, bd.getMonth(), bd.getDate());
  if (thisYearBirthday > cutoff) age--;
  return age;
}

function suggestSeries(birthDate: string, year: number): string | null {
  const age = ageAtCutoff(birthDate, year);
  const map: Record<number, string> = {
    1: 'Ninho',
    2: 'Grupo 2',
    3: 'Grupo 3',
    4: 'Grupo 4',
    5: 'Grupo 5',
    6: '1º Ano',
    7: '2º Ano',
    8: '3º Ano',
    9: '4º Ano',
    10: '5º Ano',
  };
  return map[age] || null;
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function calcAge(birthDate: string): string {
  if (!birthDate) return '—';
  const bd = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return `${age} ano${age !== 1 ? 's' : ''}`;
}

export function StudentManagement() {
  const { user } = useAuth();
  const { selectedYear } = useYear();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const emptyForm = { name: '', birthDate: '', classId: '', parent1: '', parent2: '' };
  const [form, setForm] = useState<Partial<Student>>(emptyForm);
  const [dateInputText, setDateInputText] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Partial<Student>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importClassId, setImportClassId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Classes for this year
  const managedClasses = useMemo(() => {
    let classes = mockClasses.filter((c: ClassGroup) => c.yearId === selectedYear.id);
    if (user?.role === 'coordinator' && user.managedLevel !== 'all') {
      return classes.filter((c: ClassGroup) => c.level === user.managedLevel);
    }
    return classes;
  }, [user, selectedYear]);

  // Filtered student list for the selected year
  const displayed = useMemo(() => {
    const classIds = managedClasses.map((c: ClassGroup) => c.id);
    const enrolledIds = mockEnrollments
      .filter((e: Enrollment) => e.yearId === selectedYear.id && (filterClass ? e.classId === filterClass : classIds.includes(e.classId)))
      .map((e: Enrollment) => e.studentId);

    return students.filter((s: Student) => {
      const matchEnrolled = enrolledIds.includes(s.id);
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      return matchEnrolled && matchSearch;
    });
  }, [students, search, filterClass, managedClasses, selectedYear]);

  // Handle birthdate change → auto-suggest class
  const handleBirthDate = (val: string) => {
    setForm(f => ({ ...f, birthDate: val }));
    const series = suggestSeries(val, parseInt(selectedYear.id));
    setSuggestion(series);
    if (series) {
      const match = managedClasses.find((c: ClassGroup) => c.series === series);
      if (match) setForm(f => ({ ...f, birthDate: val, classId: match.id }));
    }
  };

  const handleBirthDateInput = (val: string) => {
    let v = val.replace(/\D/g, '');
    if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
    if (v.length > 5) v = v.substring(0, 5) + '/' + v.substring(5, 9);
    setDateInputText(v);

    if (v.length === 10) {
      const [d, m, y] = v.split('/');
      const iso = `${y}-${m}-${d}`;
      handleBirthDate(iso);
    } else {
      setForm(f => ({ ...f, birthDate: '' }));
      setSuggestion(null);
    }
  };

  const handleSave = () => {
    if (!form.name || !form.birthDate || !form.classId || !form.parent1) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    if (editingId) {
      setStudents(prev => prev.map(s => s.id === editingId ? { ...s, ...form } as Student : s));
    } else {
      const newStudent: Student = {
        id: `s${Date.now()}`,
        name: form.name!,
        birthDate: form.birthDate!,
        classId: form.classId!,
        parent1: form.parent1!,
        parent2: form.parent2,
      };
      setStudents(prev => [...prev, newStudent]);
    }
    setForm(emptyForm);
    setSuggestion(null);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (s: Student) => {
    setForm(s);
    setDateInputText(formatDate(s.birthDate));
    setSuggestion(suggestSeries(s.birthDate, parseInt(selectedYear.id)));
    setEditingId(s.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir este aluno?')) {
      setStudents((prev: Student[]) => prev.filter((s: Student) => s.id !== id));
    }
  };

  const openNew = () => {
    setForm(emptyForm);
    setDateInputText('');
    setSuggestion(null);
    setEditingId(null);
    setIsAdding(true);
  };

  const suggestedClass = managedClasses.find((c: ClassGroup) => c.series === suggestion);

  // ---- IMPORT LOGIC ----
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
    // Handle DD/MM/YYYY
    const match = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Handle Excel serial number
    const num = Number(val);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      const date = new Date((num - 25569) * 86400000);
      return date.toISOString().split('T')[0];
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });

        // Skip header row
        const rows = jsonData.slice(1).filter((row: string[]) => row.length > 0 && row[0]);
        const errors: string[] = [];
        const parsed: Partial<Student>[] = [];

        rows.forEach((row: string[], idx: number) => {
          const name = String(row[0] || '').trim();
          const birthRaw = String(row[1] || '').trim();
          const parent1 = String(row[2] || '').trim();
          const parent2 = String(row[3] || '').trim();

          if (!name) {
            errors.push(`Linha ${idx + 2}: Nome em branco`);
            return;
          }
          const birthDate = parseDateBR(birthRaw);
          if (!birthDate) {
            errors.push(`Linha ${idx + 2}: Data inválida "${birthRaw}" para ${name}`);
            return;
          }
          if (!parent1) {
            errors.push(`Linha ${idx + 2}: Responsável 1 em branco para ${name}`);
            return;
          }

          // Auto-suggest class
          const series = suggestSeries(birthDate, parseInt(selectedYear.id));
          const autoClassId = series ? managedClasses.find((c: ClassGroup) => c.series === series)?.id : undefined;

          parsed.push({ name, birthDate, parent1, parent2: parent2 || undefined, classId: autoClassId });
        });

        setImportPreview(parsed);
        setImportErrors(errors);
        setShowImportModal(true);
      } catch {
        alert('Erro ao ler o arquivo. Verifique se é um arquivo Excel (.xlsx) ou CSV válido.');
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (!importClassId) {
      alert('Selecione uma turma para os alunos importados.');
      return;
    }

    const newStudents: Student[] = importPreview.map((s, i) => ({
      id: `s${Date.now()}_${i}`,
      name: s.name!,
      birthDate: s.birthDate!,
      classId: s.classId || importClassId, // Use auto-linked class or the manually selected fallback
      parent1: s.parent1!,
      parent2: s.parent2,
    }));

    setStudents(prev => [...prev, ...newStudents]);
    setShowImportModal(false);
    setImportPreview([]);
    setImportErrors([]);
    setImportClassId('');
    alert(`${newStudents.length} aluno(s) importado(s) com sucesso!`);
  };

  return (
    <div>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Cadastro de Alunos</h2>
          <p className="text-muted">{displayed.length} aluno{displayed.length !== 1 ? 's' : ''} encontrado{displayed.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-3">
          <button
            className="btn btn-secondary"
            onClick={handleDownloadTemplate}
            title="Baixar modelo de planilha"
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              width: '38px', height: '38px', padding: 0,
              border: '1px solid var(--color-border)', color: '#64748b' 
            }}
          >
            <Download size={18} />
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Upload size={18} /> Importar Planilha
          </button>
          <button className="btn btn-primary" onClick={openNew}>
            <UserPlus size={18} /> Novo Aluno
          </button>
        </div>
      </div>

      {/* Registration Form */}
      {isAdding && (
        <div className="card mb-6 p-6" style={{ borderTop: '4px solid var(--color-primary)' }}>
          <div className="flex justify-between items-center mb-6">
            <h3 style={{ margin: 0 }}>{editingId ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
              <X size={20} />
            </button>
          </div>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                Nome Completo <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: João da Silva"
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                Data de Nascimento <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="DD/MM/AAAA"
                value={dateInputText}
                onChange={e => handleBirthDateInput(e.target.value)}
                maxLength={10}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                Responsável 1 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Sra. Maria"
                value={form.parent1 || ''}
                onChange={e => setForm(f => ({ ...f, parent1: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                Responsável 2 <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Opcional)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Sr. João"
                value={form.parent2 || ''}
                onChange={e => setForm(f => ({ ...f, parent2: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Suggestion Banner */}
          {form.birthDate && suggestion && (
            <div style={{
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              backgroundColor: suggestedClass ? '#eff6ff' : '#fefce8',
              border: `1px solid ${suggestedClass ? '#bfdbfe' : '#fde68a'}`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              {suggestedClass
                ? <CheckCircle2 size={18} color="#2563eb" />
                : <AlertCircle size={18} color="#d97706" />
              }
              <div>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: suggestedClass ? '#1e40af' : '#92400e' }}>
                  Sugestão pela data de nascimento:&nbsp;
                </span>
                <span style={{ fontSize: '0.85rem', color: suggestedClass ? '#1e40af' : '#92400e' }}>
                  {suggestion}
                  {suggestedClass ? ` → Turma selecionada: ${suggestedClass.name}` : ' (sem turma disponível nesta série)'}
                </span>
              </div>
            </div>
          )}

          {/* Class Selector */}
          <div style={{ maxWidth: '320px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              Turma <span style={{ color: '#ef4444' }}>*</span>
              {suggestion && <span style={{ fontWeight: 400, color: '#64748b', marginLeft: '0.5rem' }}>(sugerida automaticamente)</span>}
            </label>
            <select
              value={form.classId || ''}
              onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}
              style={{ width: '100%' }}
            >
              <option value="">Selecione uma turma</option>
              {managedClasses.map((c: ClassGroup) => (
                <option key={c.id} value={c.id}>{c.name} ({c.level === 'infantil' ? 'Infantil' : 'Fundamental'})</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="btn btn-secondary" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Plus size={18} /> {editingId ? 'Salvar Alterações' : 'Cadastrar Aluno'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-4 p-4" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: '0.9rem' }}
          />
        </div>
        <select
          value={filterClass}
          onChange={e => setFilterClass(e.target.value)}
          style={{ width: '200px', fontSize: '0.85rem' }}
        >
          <option value="">Todas as turmas</option>
          {managedClasses.map((c: ClassGroup) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {(search || filterClass) && (
          <button onClick={() => { setSearch(''); setFilterClass(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <X size={14} /> Limpar
          </button>
        )}
      </div>

      {/* Student Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
            {displayed.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                  <Baby size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
                  Nenhum aluno encontrado.
                </td>
              </tr>
            )}
            {displayed.map((s, i) => {
              const enrollment = mockEnrollments.find(e => e.studentId === s.id && e.yearId === selectedYear.id);
              const cls = mockClasses.find(c => c.id === enrollment?.classId);
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}>
                  <td style={{ padding: '1rem' }}>
                    <div className="flex items-center gap-3">
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(10,115,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                          {s.name.charAt(0)}
                        </span>
                      </div>
                      <span style={{ fontWeight: 600 }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                    {formatDate(s.birthDate)}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: '#f1f5f9', fontWeight: 600 }}>
                      {calcAge(s.birthDate)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                    {s.parent1}
                    {s.parent2 && <span><br/>{s.parent2}</span>}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {cls ? (
                      <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.7rem', borderRadius: '6px', fontWeight: 600, backgroundColor: cls.level === 'infantil' ? '#fdf4ff' : '#eff6ff', color: cls.level === 'infantil' ? '#7e22ce' : '#1d4ed8' }}>
                        {cls.name}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => navigate(`/students/${s.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', padding: '0.4rem', borderRadius: '6px' }} title="Ver Histórico/Perfil">
                        <User size={16} />
                      </button>
                      <button onClick={() => handleEdit(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.4rem', borderRadius: '6px' }} title="Editar Dados">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.4rem', borderRadius: '6px' }} title="Excluir Aluno">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== IMPORT MODAL ===== */}
      {showImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '850px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem', borderBottom: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'rgba(10,115,255,0.1)', padding: '0.6rem', borderRadius: '10px' }}>
                  <FileSpreadsheet size={22} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Importar Alunos via Planilha</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    {importPreview.length} aluno(s) encontrado(s) no arquivo
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>

              {/* Download template */}
              <div style={{
                padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem',
                backgroundColor: '#f0f9ff', border: '1px solid #bae6fd',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Download size={18} color="#0284c7" />
                  <span style={{ fontSize: '0.85rem', color: '#0c4a6e' }}>
                    Precisa do modelo? Baixe a planilha de exemplo.
                  </span>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  style={{
                    padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                    backgroundColor: '#0284c7', color: 'white', border: 'none',
                    borderRadius: '6px', cursor: 'pointer',
                  }}
                >
                  Baixar Modelo
                </button>
              </div>

              {/* Errors */}
              {importErrors.length > 0 && (
                <div style={{
                  padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem',
                  backgroundColor: '#fef2f2', border: '1px solid #fecaca',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <AlertTriangle size={16} color="#dc2626" />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#991b1b' }}>
                      {importErrors.length} aviso(s) encontrado(s):
                    </span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.8rem', color: '#b91c1c' }}>
                    {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              {/* Class selector for import (FALLBACK) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                  Turma de destino (caso não seja identificada automaticamente)
                </label>
                <select
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  style={{ width: '100%', maxWidth: '400px' }}
                >
                  <option value="">Selecione a turma padrão para os alunos sem turma sugerida</option>
                  {managedClasses.map((c: ClassGroup) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.level === 'infantil' ? 'Infantil' : 'Fundamental'})</option>
                  ))}
                </select>
              </div>

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div style={{ borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0', width: '40px' }}>#</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Nome</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Nascimento</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Responsável 1</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Responsável 2</th>
                        <th style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Série Sugerida</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((s, i) => {
                        const sug = s.birthDate ? suggestSeries(s.birthDate, parseInt(selectedYear.id)) : null;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.6rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{i + 1}</td>
                            <td style={{ padding: '0.6rem 1rem', fontWeight: 600 }}>{s.name}</td>
                            <td style={{ padding: '0.6rem 1rem', textAlign: 'center', color: '#64748b' }}>
                              {s.birthDate ? formatDate(s.birthDate) : '—'}
                            </td>
                            <td style={{ padding: '0.6rem 1rem', color: '#64748b' }}>{s.parent1}</td>
                            <td style={{ padding: '0.6rem 1rem', color: '#94a3b8' }}>{s.parent2 || '—'}</td>
                            <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                              {s.classId ? (
                                <span style={{
                                  fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px',
                                  backgroundColor: '#dcfce7', color: '#166534', fontWeight: 700,
                                }}>
                                  {managedClasses.find(c => c.id === s.classId)?.name}
                                </span>
                              ) : (
                                sug ? (
                                  <span style={{
                                    fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px',
                                    backgroundColor: '#eff6ff', color: '#1d4ed8', fontWeight: 600,
                                  }}>{sug} (Sem turma)</span>
                                ) : '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {importPreview.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <FileSpreadsheet size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  <p>Nenhum aluno válido encontrado no arquivo.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 2rem', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ fontSize: '0.85rem' }}
              >
                <Upload size={16} /> Escolher Outro Arquivo
              </button>
              <div className="flex gap-3">
                <button
                  className="btn btn-secondary"
                  onClick={() => { setShowImportModal(false); setImportPreview([]); setImportErrors([]); }}
                >
                  Cancelar
                </button>
                 <button
                  className="btn btn-primary"
                  onClick={handleConfirmImport}
                  disabled={importPreview.length === 0}
                >
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
