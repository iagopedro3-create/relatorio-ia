import { useState } from 'react';
import { CheckCircle, Save, Send, Undo2, History, X } from 'lucide-react';
import { StatusBadge } from './ui';
import { useAsync } from '../lib/useAsync';
import { listDocumentVersions } from '../data';
import { renderMarkdown } from '../lib/markdown';
import type { DocumentStatus, DocumentVersion, Profile, StudentDocument, UserRole } from '../types/db';

export interface ReviewChange { status?: DocumentStatus; review_note?: string | null }

interface ActionsProps {
  doc: StudentDocument;
  role: UserRole;
  saving: boolean;
  kindLabel: string; // "relatório" | "PEI"
  onSave: (change?: ReviewChange) => void;
}

/**
 * O ciclo do documento: professora salva/envia; coordenação devolve com
 * comentário ou aprova. Aprovado é imutável para a professora (o banco garante),
 * então o botão de salvar some para ela.
 */
export function ReviewActions({ doc, role, saving, kindLabel, onSave }: ActionsProps) {
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState(doc.review_note ?? '');
  const isManager = role === 'admin' || role === 'coordinator';
  const canSave = doc.status !== 'approved' || isManager;

  return (
    <div className="mt-4">
      <p className="text-muted" style={{ fontSize: '0.78rem', margin: '0 0 0.5rem' }}>
        {doc.status === 'draft' && `Rascunho salvo. Revise o texto e envie para a coordenação.`}
        {doc.status === 'submitted' && `Enviado. A coordenação vai revisar; depois da aprovação a família passa a ver.`}
        {doc.status === 'returned' && `Devolvido pela coordenação: ajuste e envie de novo.`}
        {doc.status === 'approved' && `Aprovado — visível para a família no portal.${isManager ? ' Editar cria uma nova versão.' : ''}`}
      </p>
      {doc.status === 'returned' && doc.review_note && (
        <div className="callout callout-warning mb-3" style={{ fontSize: '0.85rem' }}>
          <Undo2 size={16} /><span><strong>Comentário da coordenação:</strong> {doc.review_note}</span>
        </div>
      )}

      {returning ? (
        <div className="mb-3">
          <textarea autoFocus value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder={`O que a professora precisa ajustar neste ${kindLabel}? (ela recebe este comentário)`} style={{ fontSize: '0.9rem' }} />
          <div className="flex gap-2 mt-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setReturning(false)}><X size={14} /> Cancelar</button>
            <button className="btn btn-primary btn-sm" disabled={saving || !note.trim()} onClick={() => { onSave({ status: 'returned', review_note: note.trim() }); setReturning(false); }}>
              <Undo2 size={14} /> Devolver com comentário
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {canSave && (
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} disabled={saving} onClick={() => onSave()}>
              <Save size={16} /> Salvar edições
            </button>
          )}
          {role === 'teacher' && doc.status !== 'approved' && (
            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={saving} onClick={() => onSave({ status: 'submitted' })}>
              <Send size={16} /> {doc.status === 'submitted' ? 'Reenviar' : 'Enviar para coordenação'}
            </button>
          )}
          {isManager && doc.status !== 'approved' && (
            <>
              <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} disabled={saving} onClick={() => setReturning(true)} title="Devolver à professora com um comentário">
                <Undo2 size={16} /> Devolver
              </button>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} disabled={saving} onClick={() => onSave({ status: 'approved', review_note: null })}>
                <CheckCircle size={16} /> Aprovar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface HistoryProps {
  doc: StudentDocument;
  staff: Profile[];
  /** O documento acabou de mudar; força recarga. */
  refreshKey?: string | number;
}

/** Quem mudou o quê, quando: as versões gravadas pelo banco a cada edição ou mudança de status. */
export function VersionHistory({ doc, staff, refreshKey }: HistoryProps) {
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<DocumentVersion | null>(null);
  const versionsQ = useAsync(() => open ? listDocumentVersions(doc.id) : Promise.resolve([] as DocumentVersion[]), [doc.id, open, refreshKey], [] as DocumentVersion[]);
  const nameOf = (id: string | null) => staff.find(s => s.id === id)?.name?.split(' ')[0] ?? '—';

  return (
    <div className="mt-3">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)} style={{ fontSize: '0.8rem' }}>
        <History size={14} /> {open ? 'Ocultar versões' : 'Versões'}
      </button>
      {open && (
        <div className="mt-2" style={{ fontSize: '0.8rem' }}>
          {versionsQ.loading ? <span className="text-muted">Carregando…</span> : versionsQ.data.length === 0 ? <span className="text-muted">Sem versões gravadas.</span> : (
            <div style={{ display: 'grid', gap: '0.25rem', maxHeight: '160px', overflowY: 'auto' }}>
              {[...versionsQ.data].reverse().map(v => (
                <button key={v.id} type="button" onClick={() => setViewing(v)} className="flex items-center justify-between w-full text-left bg-transparent cursor-pointer rounded-md px-2 py-1 hover:bg-[var(--color-surface-2)]" style={{ border: '1px solid var(--color-border-soft)', fontFamily: 'inherit', fontSize: '0.8rem', gap: '0.5rem' }}>
                  <span>v{v.version_no} · {new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} · {nameOf(v.created_by)}</span>
                  <span className="flex items-center gap-2"><StatusBadge status={v.status} />{v.review_note ? <span className="text-muted" title={v.review_note}>com comentário</span> : null}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {viewing && (
        <div className="dialog-overlay" onClick={() => setViewing(null)}>
          <div className="card" style={{ maxWidth: '800px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Versão {viewing.version_no} · {new Date(viewing.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} <StatusBadge status={viewing.status} /></h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setViewing(null)}>Fechar</button>
            </div>
            {viewing.review_note && <div className="callout callout-warning mb-3" style={{ fontSize: '0.85rem' }}><Undo2 size={16} /><span>{viewing.review_note}</span></div>}
            <div>{renderMarkdown(viewing.content)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
