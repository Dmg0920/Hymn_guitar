'use client';

import { useActionState, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { INITIAL_FORM_STATE } from '@/lib/form-state';
import { SITE } from '@/lib/site';
import { NICKNAME_MAX, PASSWORD_MIN } from '@/lib/validation';
import {
  sendEmailOtp,
  signInWithPassword,
  signUpWithPassword,
  verifyEmailOtp,
} from './actions';

type Tab = 'signin' | 'signup' | 'email';

const TABS: { id: Tab; label: string }[] = [
  { id: 'signin', label: '帳號登入' },
  { id: 'signup', label: '註冊帳號' },
  { id: 'email', label: 'Email 驗證碼' },
];

export function LoginForms({ next }: { next: string }) {
  const [tab, setTab] = useState<Tab>('signin');

  return (
    <div className="card p-5">
      <div role="tablist" className="mb-5 grid grid-cols-3 gap-1 rounded-full bg-paper p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full py-1.5 ${tab === t.id ? 'bg-card font-medium shadow-sm' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'signin' && <SignInForm next={next} />}
      {tab === 'signup' && <SignUpForm next={next} />}
      {tab === 'email' && <EmailOtpForm next={next} />}
    </div>
  );
}

function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInWithPassword, INITIAL_FORM_STATE);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field label="帳號" name="username" autoComplete="username" />
      <Field label="密碼" name="password" type="password" autoComplete="current-password" />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '登入中…' : '登入'}
      </button>
      <p className="text-center text-xs text-muted">
        忘記密碼？請
        {SITE.instagramUrl ? (
          <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline">
            私訊 IG
          </a>
        ) : (
          '私訊 IG'
        )}
        ，我會幫你重設。
      </p>
    </form>
  );
}

function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpWithPassword, INITIAL_FORM_STATE);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <Field
        label="帳號（英文小寫、數字、底線，3–20 字）"
        name="username"
        autoComplete="username"
        pattern="[a-zA-Z0-9_]{3,20}"
      />
      <Field
        label={`密碼（至少 ${PASSWORD_MIN} 字）`}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
      />
      <Field label="暱稱（顯示用）" name="nickname" maxLength={NICKNAME_MAX} />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? '註冊中…' : '註冊並登入'}
      </button>
    </form>
  );
}

function EmailOtpForm({ next }: { next: string }) {
  const [sendState, sendAction, sending] = useActionState(sendEmailOtp, INITIAL_FORM_STATE);
  const [verifyState, verifyAction, verifying] = useActionState(verifyEmailOtp, INITIAL_FORM_STATE);
  const email = verifyState.email ?? sendState.email;

  if (!email) {
    return (
      <form action={sendAction} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" />
        <FormMessage state={sendState} />
        <button type="submit" disabled={sending} className="btn-primary w-full">
          {sending ? '寄送中…' : '寄驗證碼給我'}
        </button>
        <p className="text-center text-xs text-muted">第一次使用會自動建立帳號。</p>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-muted">
        驗證碼已寄到 <span className="font-medium text-ink">{email}</span>
      </p>
      <Field
        label="驗證碼"
        name="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="6 位數字"
      />
      <FormMessage state={verifyState.error ? verifyState : sendState} />
      <button type="submit" disabled={verifying} className="btn-primary w-full">
        {verifying ? '驗證中…' : '登入'}
      </button>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string };

function Field({ label, name, ...inputProps }: FieldProps) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} required className="input" {...inputProps} />
    </label>
  );
}
