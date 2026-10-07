'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { PASSWORD_MIN } from '@/lib/validation';
import { resetPassword } from './actions';

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, INITIAL_FORM_STATE);

  return (
    <details className="card p-4">
      <summary className="cursor-pointer font-medium transition-colors hover:text-accent">幫使用者重設密碼</summary>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input name="username" required placeholder="帳號" aria-label="使用者帳號" autoComplete="off" className="input" />
        <input
          name="password"
          required
          minLength={PASSWORD_MIN}
          placeholder={`新密碼（至少 ${PASSWORD_MIN} 字）`}
          aria-label="新密碼"
          autoComplete="new-password"
          className="input"
        />
        <SubmitButton pending={pending} idle="重設" busy="重設中…" className="min-h-12" />
        <div className="sm:col-span-3">
          <FormMessage state={state} />
        </div>
      </form>
    </details>
  );
}
