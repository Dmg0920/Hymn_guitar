import { Spinner } from './Spinner';

type Props = {
  pending: boolean;
  idle: string;
  busy: string;
  className?: string;
};

/** 表單送出鈕：送出中顯示載入圈並停用。 */
export function SubmitButton({ pending, idle, busy, className = 'min-h-14 w-full text-base' }: Props) {
  return (
    <button type="submit" disabled={pending} className={`btn-primary ${className}`}>
      {pending ? (
        <>
          <Spinner />
          {busy}
        </>
      ) : (
        idle
      )}
    </button>
  );
}
