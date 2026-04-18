export {
  assetUrl,
  dracoDecoderPath,
  joinAssetBase,
  npcLabelFontUrl,
} from '@/lib/assets';

export function fontUrl(fontPath: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/assets/fonts/${fontPath}`;
}
