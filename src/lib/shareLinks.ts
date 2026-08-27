/**
 * 별도 앱키·SDK 없이 바로 동작하는 플랫폼별 공유 링크.
 * 새 창(또는 새 탭)으로 열어 그 자리에서 게시/전송하도록 유도한다.
 */

export function buildFacebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function buildXShareUrl(url: string, text: string): string {
  return `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
}

export function buildSmsShareUrl(url: string, text: string): string {
  const body = encodeURIComponent(`${text} ${url}`);
  // iOS/Android 모두 널리 지원되는 형식. 일부 구형 iOS는 sms:&body= 형식을 쓰지만
  // 최신 iOS·안드로이드는 이 형식도 정상 인식한다.
  return `sms:?body=${body}`;
}
