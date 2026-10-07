'use client';

import { useActionState, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { NICKNAME_MAX } from '@/lib/validation';
import { saveNickname } from './actions';

export function NicknameForm({ next, defaultValue }: { next: string; defaultValue: string }) {
  const [state, action, pending] = useActionState(saveNickname, INITIAL_FORM_STATE);
  // controlled：送出失敗時 React 19 會 reset 表單，不能把剛打的暱稱洗掉
  const [nickname, setNickname] = useState(defaultValue);

  return (
    <form action={action} className="card space-y-5 p-5 shadow-xl shadow-black/5 md:p-7">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="nickname" className="label">
          暱稱
        </label>
        <input
          id="nickname"
          name="nickname"
          required
          maxLength={NICKNAME_MAX}
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="你的暱稱"
          autoComplete="nickname"
          className="input min-h-14 font-serif text-lg font-bold"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} idle="儲存" busy="儲存中…" />
    </form>
  );
}
