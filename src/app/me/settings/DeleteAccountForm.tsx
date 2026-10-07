'use client';

import { useActionState, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { Spinner } from '@/components/Spinner';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { deleteAccount } from './actions';

// 'use server' 檔案只能匯出 async function，確認字樣在這裡再寫一次（與 actions.ts 的 DELETE_CONFIRM_TEXT 一致）
const CONFIRM_TEXT = '刪除';

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, INITIAL_FORM_STATE);
  const [confirm, setConfirm] = useState('');

  return (
    <form action={action} className="card space-y-5 border-danger/40 p-5 md:p-7">
      <div>
        <label htmlFor="confirm" className="label">
          請輸入「{CONFIRM_TEXT}」確認
        </label>
        <input id="confirm" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="input" />
      </div>
      <FormMessage state={state} />
      <button
        type="submit"
        disabled={pending || confirm !== CONFIRM_TEXT}
        className="btn min-h-14 w-full bg-danger text-base text-white"
      >
        {pending ? (
          <>
            <Spinner />
            刪除中…
          </>
        ) : (
          '永久刪除我的帳號'
        )}
      </button>
    </form>
  );
}
