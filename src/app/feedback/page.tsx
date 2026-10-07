import type { Metadata } from 'next';
import { requireViewer } from '@/lib/auth';
import { FeedbackForm } from './FeedbackForm';

export const metadata: Metadata = { title: '意見箱' };

export default async function FeedbackPage() {
  await requireViewer('/feedback');

  return (
    <section className="wrap-narrow pb-8 pt-12 md:pt-20">
      <p className="eyebrow">Feedback</p>
      <h1 className="mt-4 font-serif text-5xl font-black tracking-wide md:text-7xl">意見箱</h1>
      <p className="mt-5 max-w-sm text-balance text-muted">
        建議、問題、想說的話都歡迎。只有站長看得到，並且會知道是你留的。
      </p>

      <div className="mt-10 md:mt-12">
        <FeedbackForm />
      </div>
    </section>
  );
}
