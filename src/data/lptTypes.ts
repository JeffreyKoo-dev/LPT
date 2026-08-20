import { LptTypeMeta } from "@/types/lpt";

/**
 * LPT 12유형 메타데이터.
 * 모든 설명은 "경향 / 가능성 / 도움이 될 수 있음" 톤을 따르며, 단정적 표현을
 * 사용하지 않는다. (표현 원칙 참고: README.md)
 */
export const LPT_TYPES: LptTypeMeta[] = [
  {
    id: "VANGUARD",
    name: "선봉의 전사",
    quadrant: "추진형",
    energyGroup: "성장기",
    tagline: "일단 부딪히며 길을 여는 타입일 수 있어요",
    description:
      "목표가 보이면 망설임보다 실행이 먼저 따라오는 경향이 있습니다. 새로운 시도를 벌이는 초반 추진력에서 특히 힘을 발휘할 수 있어요.",
    strengths: ["빠른 실행력", "위기 상황에서의 결단", "주변을 이끄는 추진력"],
    growthPoints: ["속도를 늦추고 점검하는 시간 확보", "완급 조절 연습"],
  },
  {
    id: "COMMANDER",
    name: "지휘관",
    quadrant: "추진형",
    energyGroup: "균형기",
    tagline: "목표와 사람 사이에서 균형을 잡으려는 타입일 수 있어요",
    description:
      "방향을 정하고 사람들을 조율하며 함께 나아가는 데 에너지를 쏟는 경향이 있습니다. 리더십을 발휘할 때 안정감을 함께 챙기는 편일 수 있어요.",
    strengths: ["조직력", "설득력 있는 커뮤니케이션", "장기 목표 관리"],
    growthPoints: ["의사결정을 나눠보는 연습", "완벽한 통제보다 위임 시도"],
  },
  {
    id: "STRATEGIST",
    name: "책략가",
    quadrant: "추진형",
    energyGroup: "수렴기",
    tagline: "치밀하게 계산한 뒤 움직이는 타입일 수 있어요",
    description:
      "행동하기 전에 변수를 따져보고 효율적인 경로를 찾는 데 강점이 있는 경향이 있습니다. 문제를 구조적으로 푸는 데 도움이 될 수 있어요.",
    strengths: ["분석적 판단", "자원 배분 감각", "냉정한 상황 파악"],
    growthPoints: ["직관적 시도에 마음을 열어보기", "완벽한 계획 없이도 시작하는 연습"],
  },
  {
    id: "ADVENTURER",
    name: "모험가",
    quadrant: "확장형",
    energyGroup: "성장기",
    tagline: "새로운 자극을 따라 영역을 넓히는 타입일 수 있어요",
    description:
      "낯선 환경이나 사람을 만나는 것에서 에너지를 얻는 경향이 있습니다. 다양한 경험을 빠르게 흡수하는 데 도움이 될 수 있어요.",
    strengths: ["적응력", "네트워킹", "새로운 기회 포착"],
    growthPoints: ["한 가지를 끝까지 마무리하는 연습", "루틴 만들기"],
  },
  {
    id: "BARD",
    name: "음유시인",
    quadrant: "확장형",
    energyGroup: "균형기",
    tagline: "사람과 사람 사이를 잇는 타입일 수 있어요",
    description:
      "관계 속에서 분위기를 조율하고 이야기를 나누는 데 자연스러운 편일 수 있습니다. 공감과 표현력이 강점으로 드러날 수 있어요.",
    strengths: ["공감 능력", "분위기 메이킹", "설득이 아닌 공감 기반 소통"],
    growthPoints: ["갈등을 피하지 않고 마주하는 연습", "혼자만의 정리 시간 확보"],
  },
  {
    id: "SHADOW_MERCHANT",
    name: "그림자 상인",
    quadrant: "확장형",
    energyGroup: "수렴기",
    tagline: "실속을 챙기며 관계를 넓히는 타입일 수 있어요",
    description:
      "사람들과 폭넓게 교류하면서도 실질적인 이득과 효율을 놓치지 않는 경향이 있습니다. 협상이나 거래 상황에서 도움이 될 수 있어요.",
    strengths: ["협상력", "실용적 판단", "폭넓은 인맥 활용"],
    growthPoints: ["단기 이익보다 장기 신뢰 쌓기", "손해를 감수하는 관계 연습"],
  },
  {
    id: "INVENTOR",
    name: "발명가",
    quadrant: "설계형",
    energyGroup: "성장기",
    tagline: "새로운 아이디어를 실험하는 타입일 수 있어요",
    description:
      "혼자만의 시간에 아이디어를 발전시키고 새로운 방식을 시도하는 데 에너지를 쓰는 경향이 있습니다. 창의적인 문제 해결에 강점이 있을 수 있어요.",
    strengths: ["창의적 사고", "몰입력", "새로운 방법론 탐구"],
    growthPoints: ["아이디어를 실제로 공유하고 검증받기", "완성도보다 완료를 우선하기"],
  },
  {
    id: "ARCHITECT",
    name: "건축가",
    quadrant: "설계형",
    energyGroup: "균형기",
    tagline: "체계를 세우고 완성해가는 타입일 수 있어요",
    description:
      "구조와 원칙을 세운 뒤 차근차근 완성해가는 데 안정감을 느끼는 경향이 있습니다. 장기 프로젝트를 꾸준히 이끄는 데 도움이 될 수 있어요.",
    strengths: ["체계적 설계", "꾸준함", "품질 관리"],
    growthPoints: ["예상치 못한 변수에 유연하게 대응하기", "완벽주의 내려놓기"],
  },
  {
    id: "SAGE",
    name: "현자",
    quadrant: "설계형",
    energyGroup: "수렴기",
    tagline: "본질을 파고들어 이해하려는 타입일 수 있어요",
    description:
      "깊이 있는 사고와 원리 이해를 통해 스스로 납득할 때 움직이는 경향이 있습니다. 복잡한 문제의 핵심을 짚어내는 데 도움이 될 수 있어요.",
    strengths: ["깊이 있는 통찰", "논리적 일관성", "본질 파악 능력"],
    growthPoints: ["생각을 행동으로 옮기는 속도 높이기", "타인과 생각을 나누는 연습"],
  },
  {
    id: "EXPLORER",
    name: "탐험가",
    quadrant: "탐색형",
    energyGroup: "성장기",
    tagline: "호기심을 따라 가능성을 넓히는 타입일 수 있어요",
    description:
      "정해진 틀보다 열린 가능성을 따라가며 배우는 것을 즐기는 경향이 있습니다. 변화에 유연하게 대응하는 데 강점이 있을 수 있어요.",
    strengths: ["유연한 사고", "빠른 학습력", "변화 적응력"],
    growthPoints: ["선택지를 좁히고 결정하는 연습", "마무리 짓는 습관 만들기"],
  },
  {
    id: "HEALER",
    name: "치유사",
    quadrant: "탐색형",
    energyGroup: "균형기",
    tagline: "조용히 곁을 지키며 균형을 살피는 타입일 수 있어요",
    description:
      "주변 사람들의 상태를 살피고 편안한 분위기를 만드는 데 마음을 쓰는 경향이 있습니다. 관계의 균형을 잡는 데 도움이 될 수 있어요.",
    strengths: ["세심한 배려", "안정적인 분위기 조성", "경청 능력"],
    growthPoints: ["자신의 필요를 먼저 표현하는 연습", "적당한 거리두기"],
  },
  {
    id: "HERMIT",
    name: "은둔학자",
    quadrant: "탐색형",
    energyGroup: "수렴기",
    tagline: "혼자만의 세계에서 깊이를 쌓는 타입일 수 있어요",
    description:
      "홀로 몰입하는 시간 속에서 자신만의 관점과 전문성을 다져가는 경향이 있습니다. 깊이 있는 탐구가 필요한 작업에 강점이 있을 수 있어요.",
    strengths: ["집중력", "독립적 사고", "전문성 축적"],
    growthPoints: ["관점을 외부와 공유해보기", "협업 경험 늘리기"],
  },
];

export function getLptTypeMeta(id: string): LptTypeMeta | undefined {
  return LPT_TYPES.find((t) => t.id === id);
}
