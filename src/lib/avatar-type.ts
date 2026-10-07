// 頭像在瀏覽器端先裁成正方形並縮到 AVATAR_SIZE，所以檔案很小；伺服器端再驗一次。
// 這個檔案不能 import 其他 @/ 模組，單元測試直接用 node 執行它。
export const AVATAR_SIZE = 256;
export const AVATAR_MAX_BYTES = 200 * 1024; // 要與 0005_profiles.sql 的 bucket file_size_limit 一致

export type AvatarType = { mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' };

/** 看檔案開頭的 magic bytes 判斷格式，不信任瀏覽器給的 Content-Type。 */
export function sniffAvatarType(bytes: Uint8Array): AvatarType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  if (startsWith([0xff, 0xd8, 0xff])) return { mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: 'image/png', ext: 'png' };
  // RIFF....WEBP
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}
