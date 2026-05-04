import { useYear } from '../contexts/YearContext';
import { mockStudents, mockClasses, mockEnrollments } from '../store/mockDb';

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

  // Classes for this year
  const managedClasses = useMemo(() => {
    let classes = mockClasses.filter(c => c.yearId === selectedYear.id);
    if (user?.role === 'coordinator' && user.managedLevel !== 'all') {
      return classes.filter(c => c.level === user.managedLevel);
    }
    return classes;
  }, [user, selectedYear]);

  // Filtered student list for the selected year
  const displayed = useMemo(() => {
    const classIds = managedClasses.map(c => c.id);
    const enrolledIds = mockEnrollments
      .filter(e => e.yearId === selectedYear.id && (filterClass ? e.classId === filterClass : classIds.includes(e.classId)))
      .map(e => e.studentId);

    return students.filter(s => {
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
      const match = managedClasses.find(c => c.series === series);
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
    setSuggestion(suggestSeries(s.birthDate));
    setEditingId(s.id);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir este aluno?')) {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const openNew = () => {
    setForm(emptyForm);
    setDateInputText('');
    setSuggestion(null);
    setEditingId(null);
    setIsAdding(true);
  };

  const suggestedClass = managedClasses.find(c => c.series === suggestion);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ margin: 0 }}>Cadastro de Alunos</h2>
          <p className="text-muted">{displayed.length} aluno{displayed.length !== 1 ? 's' : ''} encontrado{displayed.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <UserPlus size={18} /> Novo Aluno
        </button>
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
              {managedClasses.map(c => (
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
          {managedClasses.map(c => (
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
    </div>
  );
}
