/**
 * 한글 받침 유무에 따라 조사(을/를 등)를 올바르게 고르는 유틸리티.
 * 사주 십성 문구, 유형/뱃지/퀘스트 이름처럼 런타임에 결정되는 한글 단어 뒤에
 * 조사를 하드코딩하면 받침이 없는 단어(무/기/계 등)에서 문법 오류가 난다.
 */

/** 한글 완성형 문자(가~힣)인지 확인한다 */
function isHangulSyllable(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
}

/** 단어의 마지막 글자에 받침이 있는지 확인한다. 한글이 아니면 true(받침 있음)로 간주한다. */
export function hasBatchim(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  if (!isHangulSyllable(last)) return true;
  const code = last.charCodeAt(0) - 0xac00;
  return code % 28 !== 0;
}

/** 받침 유무에 맞는 목적격 조사(을/를)를 반환한다 */
export function objectParticle(word: string): "을" | "를" {
  return hasBatchim(word) ? "을" : "를";
}

/** 받침 유무에 맞는 주격 조사(이/가)를 반환한다 */
export function subjectParticle(word: string): "이" | "가" {
  return hasBatchim(word) ? "이" : "가";
}

/** 받침 유무에 맞는 보조사(은/는)를 반환한다 */
export function topicParticle(word: string): "은" | "는" {
  return hasBatchim(word) ? "은" : "는";
}

/** 받침 유무에 맞는 접속조사(과/와)를 반환한다 */
export function conjunctionParticle(word: string): "과" | "와" {
  return hasBatchim(word) ? "과" : "와";
}
