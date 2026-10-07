import { STATUS_LABELS, type SongStatus } from '@/lib/songs';

const STEPS = ['open', 'practicing', 'uploaded'] as const satisfies readonly SongStatus[];

/** 點歌進度：等待中 → 練習中 → 已上傳。暫不接的歌不走這條軌，改顯示一顆標籤。 */
export function StatusTrack({ status }: { status: SongStatus }) {
  if (status === 'declined') {
    return (
      <span className="block rounded-xl bg-paper-2 px-3 py-2 text-center text-xs font-medium text-muted">
        {STATUS_LABELS.declined}・這首暫時不接受點播
      </span>
    );
  }

  const current = STEPS.indexOf(status);

  return (
    <ol aria-label={`目前進度：${STATUS_LABELS[status]}`} className="flex items-start">
      {STEPS.map((step, i) => {
        const isDone = i < current;
        const isCurrent = i === current;
        return (
          <li key={step} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-1 flex-col items-center gap-1.5 text-center">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-[0.6875rem] h-px w-full ${i <= current ? 'bg-accent' : 'bg-field'}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 grid size-[1.375rem] place-items-center rounded-full border-2 text-[0.625rem] font-bold ${
                isDone || isCurrent
                  ? 'border-accent bg-accent text-accent-ink'
                  : 'border-field bg-card text-transparent'
              }`}
            >
              {isCurrent && (
                <span className="absolute inset-0 animate-[ping-soft_2.4s_ease-out_infinite] rounded-full bg-accent" />
              )}
              <span className="relative">{isDone ? '✓' : isCurrent ? '●' : ''}</span>
            </span>
            <span className={`text-xs ${isCurrent ? 'font-bold text-ink' : 'text-muted'}`}>
              {STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
