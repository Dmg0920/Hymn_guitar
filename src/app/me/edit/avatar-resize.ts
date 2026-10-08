import { AVATAR_MAX_BYTES, AVATAR_SIZE } from '@/lib/avatar-type';

const SOURCE_MAX_BYTES = 15 * 1024 * 1024;

export class AvatarError extends Error {}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** 把使用者選的圖片置中裁成正方形、縮到 AVATAR_SIZE，輸出 WebP（瀏覽器不支援編碼時改用 JPEG）。 */
export async function resizeAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new AvatarError('請選擇圖片檔');
  if (file.size > SOURCE_MAX_BYTES) throw new AvatarError('圖片太大了，請選 15MB 以內的圖片');

  let bitmap: ImageBitmap;
  try {
    // from-image：照片的 EXIF 方向（手機直拍）要轉正
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new AvatarError('無法讀取這張圖片，請換一張（JPG、PNG、WebP）');
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const context = canvas.getContext('2d');
    if (!context) throw new AvatarError('你的瀏覽器不支援圖片處理');
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE,
    );

    let blob = await toBlob(canvas, 'image/webp', 0.85);
    if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.88);
    if (!blob || blob.size > AVATAR_MAX_BYTES) throw new AvatarError('圖片處理失敗，請換一張');
    return blob;
  } finally {
    bitmap.close();
  }
}
