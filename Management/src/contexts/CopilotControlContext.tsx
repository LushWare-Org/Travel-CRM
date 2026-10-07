import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CopilotClaim } from '@/features/copilot/types';

export type CopilotControl = {
  /** Open the current page's copilot conversation with this finding attached. */
  askAbout: (claim: CopilotClaim) => void;
};

type CopilotControlContextValue = {
  control: CopilotControl | null;
  register: (control: CopilotControl) => () => void;
};

const CopilotControlContext = createContext<CopilotControlContextValue | null>(null);

export function CopilotControlProvider({ children }: { children: ReactNode }) {
  const [control, setControl] = useState<CopilotControl | null>(null);
  const register = useCallback((next: CopilotControl) => {
    setControl(next);
    return () => setControl((current) => current === next ? null : current);
  }, []);
  const value = useMemo(() => ({ control, register }), [control, register]);
  return <CopilotControlContext.Provider value={value}>{children}</CopilotControlContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCopilotControl(): CopilotControl | null {
  return useContext(CopilotControlContext)?.control ?? null;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRegisterCopilotControl(control: CopilotControl) {
  const context = useContext(CopilotControlContext);
  useEffect(() => context?.register(control), [context, control]);
}
