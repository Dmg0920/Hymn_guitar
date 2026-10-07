import type { FormState } from '@/lib/form-state';

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="animate-rise rounded-xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="animate-rise text-sm font-medium text-ok">
        {state.success}
      </p>
    );
  }
  return null;
}
