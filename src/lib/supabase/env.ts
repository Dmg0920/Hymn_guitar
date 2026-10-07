function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`缺少環境變數 ${name}，請參考 .env.example`);
  return value;
}

// NEXT_PUBLIC_* 必須用完整的 process.env.X 寫法，Next 才會在建置時把值內嵌到前端。
export const supabaseUrl = () =>
  required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);

export const supabasePublishableKey = () =>
  required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
