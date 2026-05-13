import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  createHeir,
  deleteHeir,
  listHeirs,
  updateHeir,
  type Heir,
  type HeirInput,
} from '../lib/heirs';

type EditingId = string | 'new' | null;

interface FormState {
  name: string;
  email: string;
  relationship: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', relationship: '' };

export default function Heirs() {
  const navigate = useNavigate();
  const [heirs, setHeirs] = useState<Heir[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<EditingId>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listHeirs()
      .then((hs) => {
        if (!cancelled) setHeirs(hs);
      })
      .catch((e) => {
        console.error('[heirs] load failed', e);
        if (!cancelled) setError('Could not load your heirs.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId('new');
    setConfirmDeleteId(null);
  }

  function startEdit(h: Heir) {
    setForm({
      name: h.name,
      email: h.email ?? '',
      relationship: h.relationship ?? '',
    });
    setEditingId(h.id);
    setConfirmDeleteId(null);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function save() {
    if (saving) return;
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setError(null);
    setSaving(true);
    const input: HeirInput = {
      name: form.name,
      email: form.email,
      relationship: form.relationship,
    };
    try {
      if (editingId === 'new') {
        const created = await createHeir(input);
        setHeirs((prev) => [...(prev ?? []), created]);
      } else if (editingId) {
        const updated = await updateHeir(editingId, input);
        setHeirs((prev) =>
          (prev ?? []).map((h) => (h.id === updated.id ? updated : h))
        );
      }
      cancelForm();
    } catch (e) {
      console.error('[heirs] save failed', e);
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: string) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await deleteHeir(id);
      setHeirs((prev) => (prev ?? []).filter((h) => h.id !== id));
      setConfirmDeleteId(null);
      if (editingId === id) cancelForm();
    } catch (e) {
      console.error('[heirs] delete failed', e);
      setError(e instanceof Error ? e.message : 'Could not delete.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="screen">
      <div className="screen-content">
        <header className="pt-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:text-ink"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M14 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </header>

        <div className="mt-3">
          <p className="eyebrow">Heritage</p>
          <h1 className="display mt-1.5 text-[32px] leading-tight">
            Heirs
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            The people who get access to your memory after you. By default
            they see everything. You can mark individual items as private if
            you want exceptions.
          </p>
        </div>

        {heirs === null && !error && (
          <div className="mt-8 space-y-3">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-paper-deep"
              />
            ))}
          </div>
        )}

        {error && editingId === null && (
          <p className="mt-4 text-sm text-[#b94d2b]">{error}</p>
        )}

        {heirs && heirs.length === 0 && editingId !== 'new' && (
          <div className="mt-10 text-center">
            <p className="display text-lg text-ink-2">No one yet.</p>
            <p className="mt-2 text-sm text-ink-3">
              Designate one or more people who will inherit your Niklaus when
              the time comes.
            </p>
          </div>
        )}

        {heirs && heirs.length > 0 && (
          <ul className="mt-8 overflow-hidden rounded-2xl border border-line bg-paper-elev">
            {heirs.map((h, i) => {
              const isEditing = editingId === h.id;
              const isConfirmingDelete = confirmDeleteId === h.id;
              return (
                <li
                  key={h.id}
                  className={
                    i < heirs.length - 1 ? 'border-b border-line' : ''
                  }
                >
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(h)}
                      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-medium text-ink">
                          {h.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-3">
                          {[h.relationship, h.email]
                            .filter(Boolean)
                            .join(' · ') || 'No details'}
                        </p>
                      </div>
                      <span className="text-lg text-ink-3">›</span>
                    </button>
                  )}
                  {isEditing && (
                    <HeirForm
                      form={form}
                      setForm={setForm}
                      onSave={save}
                      onCancel={cancelForm}
                      saving={saving}
                      isEditing
                      onDeleteRequest={() => setConfirmDeleteId(h.id)}
                      confirmingDelete={isConfirmingDelete}
                      onConfirmDelete={() => confirmDelete(h.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                      error={error}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {editingId === 'new' && (
          <div className="mt-6 rounded-2xl border border-line bg-paper-elev">
            <HeirForm
              form={form}
              setForm={setForm}
              onSave={save}
              onCancel={cancelForm}
              saving={saving}
              isEditing={false}
              error={error}
            />
          </div>
        )}

        {editingId !== 'new' && (
          <button
            type="button"
            onClick={startAdd}
            className="mt-6 w-full rounded-full border border-line bg-paper-elev py-3 text-[14px] text-ink-2 hover:bg-highlight"
          >
            + Add heir
          </button>
        )}
      </div>
    </div>
  );
}

interface HeirFormProps {
  form: FormState;
  setForm: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isEditing: boolean;
  onDeleteRequest?: () => void;
  confirmingDelete?: boolean;
  onConfirmDelete?: () => void;
  onCancelDelete?: () => void;
  error: string | null;
}

function HeirForm({
  form,
  setForm,
  onSave,
  onCancel,
  saving,
  isEditing,
  onDeleteRequest,
  confirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  error,
}: HeirFormProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <label htmlFor="heir-name" className="eyebrow block pb-1.5">
          Name
        </label>
        <input
          id="heir-name"
          autoFocus
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          disabled={saving}
          placeholder="Sofia"
          className="w-full border-b border-ink bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      </div>
      <div>
        <label htmlFor="heir-relationship" className="eyebrow block pb-1.5">
          Relationship
        </label>
        <input
          id="heir-relationship"
          type="text"
          value={form.relationship}
          onChange={(e) => setForm({ ...form, relationship: e.target.value })}
          disabled={saving}
          placeholder="Daughter"
          className="w-full border-b border-ink bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      </div>
      <div>
        <label htmlFor="heir-email" className="eyebrow block pb-1.5">
          Email <span className="text-ink-3 normal-case">(optional)</span>
        </label>
        <input
          id="heir-email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          disabled={saving}
          placeholder="sofia@example.com"
          className="w-full border-b border-ink bg-transparent py-2 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
        />
      </div>

      {error && <p className="text-xs text-[#b94d2b]">{error}</p>}

      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-full px-4 py-2 text-[13px] text-ink-2 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-paper transition-opacity disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {isEditing && onDeleteRequest && (
        <div className="border-t border-line pt-3">
          {!confirmingDelete ? (
            <button
              type="button"
              onClick={onDeleteRequest}
              disabled={saving}
              className="text-xs text-[#b94d2b] underline-offset-2 hover:underline disabled:opacity-50"
            >
              Remove this heir
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#b94d2b]/5 px-3 py-2">
              <p className="text-xs text-[#7a3320]">Remove for good?</p>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={onCancelDelete}
                  disabled={saving}
                  className="rounded-full px-3 py-1 text-xs text-ink-3 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirmDelete}
                  disabled={saving}
                  className="rounded-full bg-[#b94d2b] px-3 py-1 text-xs font-medium text-paper transition-opacity disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
