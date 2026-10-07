'use client';

import { useActionState, useId, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { SubmitButton } from '@/components/SubmitButton';
import { INITIAL_FORM_STATE, type FormState } from '@/lib/form-state';
import { FEEDBACK_MAX } from '@/lib/validation';
import { submitFeedback } from './actions';

export function FeedbackForm() {
  const id = useId();
  // 欄位用 controlled：React 19 的 form action 結束後會 reset 表單，送出失敗時不能把剛打的內容洗掉；
  // 成功時才由這裡清空。
  const [body, setBody] = useState('');
  const [state, action, pending] = useActionState(
    async (prev: FormState, formData: FormData): Promise<FormState> => {
      const result = await submitFeedback(prev, formData);
      if (result.success) setBody('');
      return result;
    },
    INITIAL_FORM_STATE,
  );

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor={`${id}-body`} className="label">
          想對我說的話
        </label>
        <textarea
          id={`${id}-body`}
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={FEEDBACK_MAX}
          rows={6}
          required
          placeholder="網站哪裡不好用、想聽什麼風格、任何想說的都可以"
          className="input min-h-40 resize-y leading-relaxed"
        />
        <p className="mt-1.5 text-right text-xs text-muted" aria-hidden="true">
          {body.length} / {FEEDBACK_MAX}
        </p>
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} idle="送出意見" busy="送出中…" />
    </form>
  );
}
