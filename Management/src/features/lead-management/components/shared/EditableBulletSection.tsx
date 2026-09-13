import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const toLines = (value: string | null | undefined) =>
  String(value || '').split('\n').map((s) => s.trim()).filter(Boolean);

interface EditableBulletSectionProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  value: string | null | undefined;
  onSave: (next: string) => Promise<void> | void;
  mode?: 'bullets' | 'text';
  placeholder?: string;
  saving?: boolean;
}

/**
 * A full-width card for an editable text field with an explicit Edit →
 * Save/Cancel flow — used for Payment Terms, Payment Instructions (point
 * form / `mode="bullets"`) and Notes (free paragraph / `mode="text"`), so
 * every "load the default, tweak it, save it" field in the invoice dialog
 * shares the same chrome. Save commits the edited value via onSave; Cancel
 * discards local edits and reverts to the last-saved `value` without
 * calling onSave.
 */
const EditableBulletSection = ({
  icon: Icon,
  title,
  subtitle,
  value,
  onSave,
  mode = 'bullets',
  placeholder = 'Add a point…',
  saving = false,
}: EditableBulletSectionProps) => {
  const [editing, setEditing] = useState(false);
  const [lines, setLines] = useState<string[]>([]);
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

  const updateLine = (idx: number, line: string) => setLines((prev) => prev.map((l, i) => (i === idx ? line : l)));
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const addLine = () => setLines((prev) => [...prev, '']);

  const bullets = toLines(value);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {!editing && (
          <Button type="button" variant="ghost" size="sm" onClick={startEditing} className="text-primary hover:text-primary">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {mode === 'text' ? (
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder={placeholder}
              className="resize-none"
            />
          ) : (
            <>
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-muted-foreground">•</span>
                  <Input
                    type="text"
                    value={line}
                    onChange={(e) => updateLine(idx, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1"
                  />
                  <button type="button" onClick={() => removeLine(idx)} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Remove point">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <Button type="button" variant="ghost" size="sm" onClick={addLine} className="text-primary hover:text-primary">
                <Plus className="h-4 w-4" /> Add point
              </Button>
            </>
          )}

          <div className="mt-3 flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" onClick={cancel}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              <Check className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      ) : mode === 'text' ? (
        value ? (
          <p className="whitespace-pre-line text-sm text-muted-foreground">{value}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No notes added yet.</p>
        )
      ) : bullets.length > 0 ? (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {bullets.map((line, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No points added yet.</p>
      )}
    </Card>
  );
};

export default EditableBulletSection;
