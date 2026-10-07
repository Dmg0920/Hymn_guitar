'use client';

import { useActionState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { formatDate } from '@/lib/format';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { deleteFeedback, setFeedbackRead } from './actions';

export type FeedbackEntry = {
  id: number;
  body: string;
  isRead: boolean;
  createdAt: string;
  nickname: string;
};

export function FeedbackItem({ entry }: { entry: FeedbackEntry }) {
  const [readState, readAction, readPending] = useActionState(setFeedbackRead, INITIAL_FORM_STATE);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteFeedback, INITIAL_FORM_STATE);

  return (
    <li className={`card space-y-3 p-4 md:p-5 ${entry.isRead ? '' : 'border-accent'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {!entry.isRead && (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-ink">未讀</span>
        )}
        <span className="font-medium">{entry.nickname}</span>
        <span className="text-xs text-muted">{formatDate(entry.createdAt)}</span>
      </div>

      {/* 使用者輸入的純文字：React 會跳脫，whitespace-pre-wrap 保留換行 */}
      <p className="whitespace-pre-wrap break-words leading-relaxed">{entry.body}</p>

      <div className="flex flex-wrap items-center gap-2">
        <form action={readAction}>
          <input type="hidden" name="feedback_id" value={entry.id} />
          <input type="hidden" name="is_read" value={String(!entry.isRead)} />
          <button type="submit" disabled={readPending} className="btn-ghost min-h-10 px-4 text-sm">
            {entry.isRead ? '標為未讀' : '標為已讀'}
          </button>
        </form>
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm('刪除這則意見？刪除後無法復原。')) event.preventDefault();
          }}
        >
          <input type="hidden" name="feedback_id" value={entry.id} />
          <button
            type="submit"
            disabled={deletePending}
            className="min-h-10 rounded-full px-4 text-sm font-medium text-danger underline-offset-4 transition-colors hover:underline"
          >
            {deletePending ? '刪除中…' : '刪除'}
          </button>
        </form>
      </div>
      <FormMessage state={readState} />
      <FormMessage state={deleteState} />
    </li>
  );
}
