'use client';

import { useActionState, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { PASSWORD_MAX, PASSWORD_MIN } from '@/lib/validation';
import { changePassword } from './actions';

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, INITIAL_FORM_STATE);
  // controlled：失敗時 React 19 會 reset 表單，不能讓人重打整串密碼
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <form action={action} className="card space-y-5 p-5 md:p-7">
      <div>
        <label htmlFor="current_password" className="label">
          目前的密碼
        </label>
        <input id="current_password" name="current_password" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="new_password" className="label">
          新密碼（至少 {PASSWORD_MIN} 個字元）
        </label>
        <input id="new_password" name="new_password" type="password" required minLength={PASSWORD_MIN} maxLength={PASSWORD_MAX} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} className="input" />
      </div>
      <div>
        <label htmlFor="confirm_password" className="label">
          再輸入一次新密碼
        </label>
        <input id="confirm_password" name="confirm_password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} idle="更新密碼" busy="更新中…" />
    </form>
  );
}
