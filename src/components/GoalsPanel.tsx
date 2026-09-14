import { useState } from 'react';
import { Plus, Trash2, Target, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, useConfirm } from './ui';
import { createGoals, deleteGoal, updateGoal } from '../data';
import type { GoalStatus, GoalTerm, PeiGoal, StudentDocument } from '../types/db';
import { GOAL_STATUS, GOAL_TERM } from '../store/goals';

interface Props {
  goals: PeiGoal[];
  doc: StudentDocument;
  /** Gestão edita sempre; a professora só enquanto o PEI não está aprovado. */
  canEditStructure: boolean;
  /** Equipe (não família) marca progresso a qualquer momento. */
  canTrack: boolean;
  /** Quantas observações estão ligadas a cada meta (chega no item 3 do roadmap). */
  evidenceCounts?: Record<string, number>;
  onChange: (goals: PeiGoal[]) => void;
  userId: string | null;
  compact?: boolean;
}

/**
 * Metas do PEI como objetos: a IA rascunha, a coordenação edita, a professora
 * acompanha. Status e progresso são sempre marcados por pessoa (nunca pela IA).
 */
export function GoalsPanel({ goals, doc, canEditStructure, canTrack, evidenceCounts = {}, onChange, userId, compact }: Props) {
  const ask = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  const patch = async (goal: PeiGoal, changes: Partial<PeiGoal>) => {
    setBusy(goal.id);
    try {
      const updated = await updateGoal(goal.id, changes);
      onChange(goals.map(g => (g.id === goal.id ? updated : g)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar a meta.');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (goal: PeiGoal) => {
    if (!(await ask({ title: 'Excluir esta meta?', description: 'As evidências ligadas a ela deixam de contar. Prefira "Descartada" se quiser manter o histórico.', danger: true, confirmLabel: 'Excluir' }))) return;
    setBusy(goal.id);
    try {
      await deleteGoal(goal.id);
      onChange(goals.filter(g => g.id !== goal.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao excluir.');
    } finally {
      setBusy(null);
    }
  };

  const add = async () => {
    setBusy('new');
    try {
      const [created] = await createGoals([{
        school_id: doc.school_id, document_id: doc.id, student_id: doc.student_id,
        axis: 'Geral', title: 'Nova meta — descreva o comportamento observável', term: 'medio',
        sort_order: goals.length, created_by: userId,
      }]);
      onChange([...goals, created]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao criar a meta.');
    } finally {
      setBusy(null);
    }
  };

  if (goals.length === 0 && !canEditStructure) {
    return <p className="text-muted" style={{ fontSize: '0.85rem' }}>Este PEI ainda não tem metas cadastradas.</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <h3 className="flex items-center gap-2" style={{ margin: 0, fontSize: '1rem' }}>
          <Target size={18} color="var(--color-secondary)" /> Metas ({goals.length})
        </h3>
        {canEditStructure && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy === 'new'} onClick={() => void add()}>
            <Plus size={14} /> Meta
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {goals.map((g, i) => (
          <div key={g.id} style={{ border: '1px solid var(--color-border)', borderRadius: '10px', padding: compact ? '0.6rem 0.8rem' : '0.85rem 1rem', background: 'var(--color-bg)', opacity: busy === g.id ? 0.6 : 1 }}>
            <div className="flex items-center gap-2 mb-2" style={{ flexWrap: 'wrap' }}>
              <span className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{i + 1}.</span>
              {canEditStructure
                ? <input defaultValue={g.axis} onBlur={e => e.target.value.trim() && e.target.value.trim() !== g.axis && void patch(g, { axis: e.target.value.trim() })} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', width: '13rem' }} title="Eixo" />
                : <Badge tone="secondary">{g.axis}</Badge>}
              <Badge tone={GOAL_STATUS[g.status].tone}>{GOAL_STATUS[g.status].label}</Badge>
              <span className="text-muted" style={{ fontSize: '0.75rem' }}>{GOAL_TERM[g.term]}</span>
              {(evidenceCounts[g.id] ?? 0) > 0 && (
                <span className="text-muted flex items-center gap-1" style={{ fontSize: '0.75rem' }} title="Registros de observação ligados a esta meta">
                  <Link2 size={12} /> {evidenceCounts[g.id]} evidência{evidenceCounts[g.id] === 1 ? '' : 's'}
                </span>
              )}
              {canEditStructure && (
                <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', padding: '0.2rem 0.5rem' }} title="Excluir meta" onClick={() => void remove(g)}><Trash2 size={13} /></button>
              )}
            </div>

            {canEditStructure ? (
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <textarea defaultValue={g.title} rows={2} placeholder="Meta (comportamento observável e específico)" style={{ fontSize: '0.9rem', fontWeight: 500 }}
                  onBlur={e => e.target.value.trim() && e.target.value.trim() !== g.title && void patch(g, { title: e.target.value.trim() })} />
                <div className="grid grid-cols-2" style={{ gap: '0.4rem' }}>
                  <input defaultValue={g.criterion ?? ''} placeholder="Como medir (ex.: em 8 de 10 oportunidades)" style={{ fontSize: '0.8rem' }}
                    onBlur={e => (e.target.value.trim() || null) !== g.criterion && void patch(g, { criterion: e.target.value.trim() || null })} />
                  <input defaultValue={g.context ?? ''} placeholder="Contexto (ex.: momentos de transição)" style={{ fontSize: '0.8rem' }}
                    onBlur={e => (e.target.value.trim() || null) !== g.context && void patch(g, { context: e.target.value.trim() || null })} />
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  <select value={g.term} onChange={e => void patch(g, { term: e.target.value as GoalTerm })} style={{ fontSize: '0.8rem', width: 'auto' }}>
                    {(Object.keys(GOAL_TERM) as GoalTerm[]).map(t => <option key={t} value={t}>{GOAL_TERM[t]}</option>)}
                  </select>
                  <input defaultValue={g.baseline ?? ''} placeholder="Linha de base (registre na primeira semana)" style={{ fontSize: '0.8rem', flex: 1, minWidth: '12rem' }}
                    onBlur={e => (e.target.value.trim() || null) !== g.baseline && void patch(g, { baseline: e.target.value.trim() || null })} />
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.9rem' }}>
                <div style={{ fontWeight: 500 }}>{g.title}</div>
                {(g.criterion || g.context) && (
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                    {g.context && <>Contexto: {g.context}. </>}{g.criterion && <>Como medir: {g.criterion}.</>}
                  </div>
                )}
                {g.baseline && <div className="text-muted" style={{ fontSize: '0.8rem' }}>Linha de base: {g.baseline}</div>}
              </div>
            )}

            {canTrack && (
              <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
                <select value={g.status} onChange={e => void patch(g, { status: e.target.value as GoalStatus })} style={{ fontSize: '0.8rem', width: 'auto' }} title="Status (marcado por pessoa, nunca pela IA)">
                  {(Object.keys(GOAL_STATUS) as GoalStatus[]).map(s => <option key={s} value={s}>{GOAL_STATUS[s].label}</option>)}
                </select>
                <input defaultValue={g.progress_note ?? ''} placeholder="Nota de progresso (o que mudou e com base em quê)" style={{ fontSize: '0.8rem', flex: 1, minWidth: '12rem' }}
                  onBlur={e => (e.target.value.trim() || null) !== g.progress_note && void patch(g, { progress_note: e.target.value.trim() || null })} />
                {g.progress_updated_at && (
                  <span className="text-muted" style={{ fontSize: '0.7rem' }}>atualizado em {new Date(g.progress_updated_at).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {canEditStructure && goals.length > 0 && (
        <p className="text-muted mt-2" style={{ fontSize: '0.75rem' }}>Edite direto nos campos; cada alteração é salva ao sair do campo. A IA rascunhou; quem decide é a equipe.</p>
      )}
    </div>
  );
}
