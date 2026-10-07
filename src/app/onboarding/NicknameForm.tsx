'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { NICKNAME_MAX } from '@/lib/validation';
import { saveNickname } from './actions';

export function NicknameForm({ next, defaultValue }: { next: string; defaultValue: string }) {
  const [state, action, pending] = useActionState(saveNickname, INITIAL_FORM_STATE);

  return (
    <form action={action} className="card space-y-4 p-5">
      <input type="hidden" name="next" value={next} />
      <input
        name="nickname"
        required
        maxLength={NICKNAME_MAX}
        defaultValue={defaultValue}
        placeholder="你的暱稱"
        className="input"
      />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '儲存中…' : '儲存'}
      </button>
    </form>
  );
}
