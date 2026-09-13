import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormGroupProps {
  label?: string;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
  helperText?: string | null;
}

const FormGroup = ({ label, required = false, error = null, children, helperText = null }: FormGroupProps) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="mb-2 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      <div className={error ? 'relative' : ''}>{children}</div>
      {error && (
        <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-2">
          <p className="flex items-center gap-2 text-xs font-medium text-destructive">
            <AlertCircle className="size-3 shrink-0" />
            {error}
          </p>
        </div>
      )}
      {helperText && !error && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};

export default FormGroup;
