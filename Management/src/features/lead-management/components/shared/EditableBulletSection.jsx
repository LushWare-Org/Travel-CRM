import { useState } from 'react';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';

const toLines = (value) => String(value || '').split('\n').map((s) => s.trim()).filter(Boolean);

/**
 * A full-width card for an editable text field with an explicit Edit →
 * Save/Cancel flow — used for Payment Terms, Payment Instructions (point
 * form / `mode="bullets"`) and Notes (free paragraph / `mode="text"`), so
 * every "load the default, tweak it, save it" field in the invoice dialog
 * shares the same chrome. Save commits the edited value via onSave; Cancel
 * discards local edits and reverts to the last-saved `value` without
 * calling onSave.
 */
const EditableBulletSection = ({ icon: Icon, title, subtitle, value, onSave, mode = 'bullets', placeholder = 'Add a point…', saving = false }) => {
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState([]);
  const [text, setText] = useState('');

  const startEditing = () => {
    if (mode === 'text') {
      setText(value || '');
    } else {
      const current = toLines(value);
      setLines(current.length > 0 ? current : ['']);
    }
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = async () => {
    const next = mode === 'text' ? text.trim() : lines.map((l) => l.trim()).filter(Boolean).join('\n');
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // Failure feedback (toast) is the caller's responsibility — stay in
      // edit mode so the user can retry without re-typing.
    }
  };

  const updateLine = (idx, line) => setLines((prev) => prev.map((l, i) => (i === idx ? line : l)));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const addLine = () => setLines((prev) => [...prev, '']);

  const bullets = toLines(value);

  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-teal-600" />}
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {mode === 'text' ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={placeholder}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          ) : (
            <>
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-slate-300">•</span>
                  <input
                    type="text"
                    value={line}
                    onChange={(e) => updateLine(idx, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button type="button" onClick={() => removeLine(idx)} className="p-1.5 text-slate-400 hover:text-red-500" aria-label="Remove point">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-700">
                <Plus className="h-4 w-4" /> Add point
              </button>
            </>
          )}

          <div className="mt-3 flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : mode === 'text' ? (
        value ? (
          <p className="whitespace-pre-line text-sm text-slate-600">{value}</p>
        ) : (
          <p className="text-sm text-slate-400">No notes added yet.</p>
        )
      ) : bullets.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-slate-600">
          {bullets.map((line, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-teal-500">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No points added yet.</p>
      )}
    </div>
  );
};

export default EditableBulletSection;
