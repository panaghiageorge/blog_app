import { useState } from "react";
import { EmptyState } from "./EmptyState";

type TaxonomyItem = {
  id: number;
  code: string;
  name: string;
  nativeName?: string;
};

type TaxonomyForm = {
  code: string;
  name: string;
  nativeName?: string;
};

type TaxonomyLabels = {
  add: string;
  code: string;
  codePlaceholder: string;
  deleteAction: string;
  editAction: string;
  empty: string;
  name: string;
  namePlaceholder: string;
  nativeName?: string;
  nativeNamePlaceholder?: string;
  saveAction: string;
  cancelAction: string;
};

type TaxonomyAdminSectionProps = {
  createPending?: boolean;
  error?: string;
  eyebrow: string;
  items: TaxonomyItem[];
  labels: TaxonomyLabels;
  onCreate: (payload: TaxonomyForm) => void;
  onDeleteRequest: (item: TaxonomyItem) => void;
  onUpdate: (id: number, payload: TaxonomyForm) => void;
  title: string;
  updatePending?: boolean;
  withNativeName?: boolean;
};

const emptyForm = { code: "", name: "", nativeName: "" };
const normalizeCode = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

export const TaxonomyAdminSection = ({
  createPending,
  error,
  eyebrow,
  items,
  labels,
  onCreate,
  onDeleteRequest,
  onUpdate,
  title,
  updatePending,
  withNativeName,
}: TaxonomyAdminSectionProps) => {
  const [form, setForm] = useState<TaxonomyForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TaxonomyForm>(emptyForm);

  const startEdit = (item: TaxonomyItem) => {
    setEditingId(item.id);
    setEditForm({ code: item.code, name: item.name, nativeName: item.nativeName ?? "" });
  };

  const submitCreate = () => {
    onCreate(form);
    setForm(emptyForm);
  };

  const submitEdit = (id: number) => {
    onUpdate(id, editForm);
    setEditingId(null);
  };

  return (
    <section className="panel taxonomy-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
      </div>

      <form
        className="form-columns taxonomy-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitCreate();
        }}
      >
        <label className="field">
          <span>{labels.code}</span>
          <input
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: normalizeCode(event.target.value) })}
            placeholder={labels.codePlaceholder}
          />
        </label>
        <label className="field">
          <span>{labels.name}</span>
          <input
            required
            minLength={2}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder={labels.namePlaceholder}
          />
        </label>
        {withNativeName && (
          <label className="field">
            <span>{labels.nativeName}</span>
            <input
              required
              minLength={2}
              value={form.nativeName ?? ""}
              onChange={(event) => setForm({ ...form, nativeName: event.target.value })}
              placeholder={labels.nativeNamePlaceholder}
            />
          </label>
        )}
        <button type="submit" disabled={createPending}>{labels.add}</button>
      </form>

      {error && <p className="error">{error}</p>}

      {items.length === 0 ? (
        <EmptyState message={labels.empty} />
      ) : (
        <div className="taxonomy-list">
          {items.map((item) => (
            <div key={item.id} className="taxonomy-row">
              {editingId === item.id ? (
                <form
                  className="taxonomy-edit-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitEdit(item.id);
                  }}
                >
                  <input
                    required
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                    value={editForm.code}
                    onChange={(event) => setEditForm({ ...editForm, code: normalizeCode(event.target.value) })}
                  />
                  <input
                    required
                    minLength={2}
                    value={editForm.name}
                    onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                  />
                  {withNativeName && (
                    <input
                      required
                      minLength={2}
                      value={editForm.nativeName ?? ""}
                      onChange={(event) => setEditForm({ ...editForm, nativeName: event.target.value })}
                    />
                  )}
                  <div className="taxonomy-actions">
                    <button type="submit" disabled={updatePending}>{labels.saveAction}</button>
                    <button className="secondary" type="button" onClick={() => setEditingId(null)}>
                      {labels.cancelAction}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span>
                    <strong>{item.nativeName ?? item.name}</strong>
                    <small>{item.code}</small>
                  </span>
                  <div className="taxonomy-actions">
                    <button className="secondary" type="button" onClick={() => startEdit(item)}>
                      {labels.editAction}
                    </button>
                    <button className="secondary" type="button" onClick={() => onDeleteRequest(item)}>
                      {labels.deleteAction}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};