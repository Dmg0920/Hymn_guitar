'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { PASSWORD_MIN } from '@/lib/validation';
import { resetPassword } from './actions';

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, INITIAL_FORM_STATE);

  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-medium">幫使用者重設密碼</summary>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input name="username" required placeholder="帳號" autoComplete="off" className="input" />
        <input
          name="password"
          required
          minLength={PASSWORD_MIN}
          placeholder={`新密碼（至少 ${PASSWORD_MIN} 字）`}
          autoComplete="new-password"
          className="input"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          重設
        </button>
        <div className="sm:col-span-3">
          <FormMessage state={state} />
        </div>
      </form>
    </details>
  );
}
