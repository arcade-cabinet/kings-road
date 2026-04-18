export function joinAssetBase(baseUrl: string, assetPath: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  const normalizedPath = assetPath.startsWith('/')
    ? assetPath
    : `/${assetPath}`;
  return `${normalizedBase}${normalizedPath}`;
}

export function assetUrl(assetPath: string): string {
  return joinAssetBase(import.meta.env.BASE_URL, assetPath);
}

export const dracoDecoderPath = assetUrl('/assets/draco/');
export const npcLabelFontUrl = assetUrl('/assets/fonts/lora-700.woff2');
