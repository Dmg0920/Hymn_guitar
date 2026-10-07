'use client';

import { useActionState, useId, useState } from 'react';
import { FormMessage } from '@/components/FormMessage';
import { Segmented } from '@/components/Segmented';
import { SubmitButton } from '@/components/SubmitButton';
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

const TABS = [
  { value: 'signin', label: '帳號登入' },
  { value: 'signup', label: '註冊' },
  { value: 'email', label: 'Email 驗證碼' },
] as const satisfies readonly { value: Tab; label: string }[];

export function LoginForms({ next }: { next: string }) {
  const idPrefix = useId();
  const [tab, setTab] = useState<Tab>('signin');

  return (
    <div className="card p-5 shadow-xl shadow-black/5 md:p-7">
      <Segmented options={TABS} value={tab} onChange={setTab} idPrefix={idPrefix} label="登入方式" className="mb-6" />
      <div role="tabpanel" id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-tab-${tab}`}>
        {tab === 'signin' && <SignInForm next={next} />}
        {tab === 'signup' && <SignUpForm next={next} />}
        {tab === 'email' && <EmailOtpForm next={next} />}
      </div>
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
      <SubmitButton pending={pending} idle="登入" busy="登入中…" />
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
      <SubmitButton pending={pending} idle="註冊並登入" busy="註冊中…" />
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
        <SubmitButton pending={sending} idle="寄驗證碼給我" busy="寄送中…" />
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
      <SubmitButton pending={verifying} idle="登入" busy="驗證中…" />
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string };

function Field({ label, name, type, ...inputProps }: FieldProps) {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);
  // 非密碼欄位用 controlled：React 19 的 form action 結束後會 reset 表單，
  // 送出失敗（帳號已被使用、密碼錯誤…）時不該把帳號、暱稱、email 洗掉。密碼則刻意讓它清空。
  const [value, setValue] = useState('');
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          required
          type={isPassword && isVisible ? 'text' : type}
          className={`input ${isPassword ? 'pr-16' : ''}`}
          {...(isPassword ? {} : { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value) })}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={isVisible ? '隱藏密碼' : '顯示密碼'}
            onClick={() => setIsVisible((v) => !v)}
            className="absolute inset-y-0 right-1 my-1 rounded-xl px-3 text-xs font-medium text-muted transition-colors hover:text-accent"
          >
            {isVisible ? '隱藏' : '顯示'}
          </button>
        )}
      </div>
    </div>
  );
}
