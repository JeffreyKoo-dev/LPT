import { Quest } from "@/types/quest";

/**
 * 성장 퀘스트 목록. 각 퀘스트는 4개 스탯(활력/통찰/조율/지구력) 중 하나를
 * 대표로 상승시키며, 캐릭터의 대표 스탯(fantasyClass.primaryStat)과 focusStat이
 * 일치하는 퀘스트가 추천 목록 상단에 노출된다 (lib/quest.ts).
 */
export const QUESTS: Quest[] = [
  {
    id: "q-onboarding",
    title: "오늘의 LPT 카드 확인하기",
    description: "결과 리포트의 '오늘의 LPT 카드'를 열어 오늘의 팁을 확인해보세요.",
    category: "루틴",
    focusStat: "지구력",
    xpReward: 20,
    statReward: 3,
    universal: true,
  },
  // 활력
  {
    id: "q-vitality-1",
    title: "10분 즉시 실행",
    description: "미루던 작업 하나를 딱 10분만 먼저 시작해보세요.",
    category: "체력",
    focusStat: "활력",
    xpReward: 40,
    statReward: 6,
    universal: false,
  },
  {
    id: "q-vitality-2",
    title: "새로운 순서로 하루 시작하기",
    description: "평소와 다른 순서로 오늘 하루를 시작해보세요.",
    category: "체력",
    focusStat: "활력",
    xpReward: 40,
    statReward: 6,
    universal: false,
  },
  {
    id: "q-vitality-3",
    title: "몸을 움직이는 15분",
    description: "15분 이상 걷거나 가볍게 스트레칭하는 시간을 가져보세요.",
    category: "체력",
    focusStat: "활력",
    xpReward: 50,
    statReward: 7,
    universal: true,
  },
  // 통찰
  {
    id: "q-insight-1",
    title: "오늘 배운 것 한 줄 기록",
    description: "오늘 새롭게 알게 된 것을 한 줄로 메모해보세요.",
    category: "몰입",
    focusStat: "통찰",
    xpReward: 40,
    statReward: 6,
    universal: true,
  },
  {
    id: "q-insight-2",
    title: "궁금했던 주제 15분 조사",
    description: "평소 궁금했던 주제를 15분만 시간 내어 찾아보세요.",
    category: "몰입",
    focusStat: "통찰",
    xpReward: 45,
    statReward: 6,
    universal: false,
  },
  {
    id: "q-insight-3",
    title: "결정 전 장단점 적어보기",
    description: "고민 중인 결정 하나를 골라 장단점을 각각 3가지씩 적어보세요.",
    category: "몰입",
    focusStat: "통찰",
    xpReward: 45,
    statReward: 7,
    universal: false,
  },
  // 조율
  {
    id: "q-harmony-1",
    title: "고마운 사람에게 메시지 보내기",
    description: "떠오르는 사람에게 짧게라도 고마움을 표현해보세요.",
    category: "관계",
    focusStat: "조율",
    xpReward: 40,
    statReward: 6,
    universal: true,
  },
  {
    id: "q-harmony-2",
    title: "끝까지 들어보기",
    description: "대화 중 상대의 말을 끊지 않고 끝까지 들어보세요.",
    category: "관계",
    focusStat: "조율",
    xpReward: 40,
    statReward: 6,
    universal: false,
  },
  {
    id: "q-harmony-3",
    title: "한 발 양보해보기",
    description: "작은 의견 차이가 생겼을 때 한 번 먼저 양보해보세요.",
    category: "관계",
    focusStat: "조율",
    xpReward: 45,
    statReward: 7,
    universal: false,
  },
  // 지구력
  {
    id: "q-endurance-1",
    title: "오늘의 우선순위 3가지",
    description: "오늘 꼭 해야 할 일 3가지를 순서대로 정해보세요.",
    category: "루틴",
    focusStat: "지구력",
    xpReward: 40,
    statReward: 6,
    universal: true,
  },
  {
    id: "q-endurance-2",
    title: "미완성 작업 하나 마무리",
    description: "미뤄뒀던 작업 중 하나를 골라 끝까지 마무리해보세요.",
    category: "루틴",
    focusStat: "지구력",
    xpReward: 50,
    statReward: 7,
    universal: false,
  },
  {
    id: "q-endurance-3",
    title: "일주일 계획 큰 틀 세우기",
    description: "이번 주 해야 할 일의 큰 흐름만 가볍게 정리해보세요.",
    category: "루틴",
    focusStat: "지구력",
    xpReward: 45,
    statReward: 6,
    universal: false,
  },
];

export function getQuestById(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}
