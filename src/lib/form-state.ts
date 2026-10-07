export type FormState = {
  error?: string;
  success?: string;
  /** Email 驗證碼流程：已寄出驗證碼的 email。 */
  email?: string;
};

export const INITIAL_FORM_STATE: FormState = {};
