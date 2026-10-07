import type { FormState } from '@/lib/form-state';

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-danger">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-sm text-ok">
        {state.success}
      </p>
    );
  }
  return null;
}
