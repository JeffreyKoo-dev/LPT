import { SurveyQuestion } from "@/types/survey";

/**
 * Life Pattern Profiler 36문항.
 * 공식 MBTI 문항을 그대로 사용하지 않고, 생활 속 행동 패턴 시나리오로 자체 작성했다.
 * 4개 축(EI/SN/TF/JP)에 각 9문항, 총 36문항이며 축 순서를 섞어 배치해 특정 축이
 * 연속으로 반복되지 않도록 구성했다.
 */

const LEFT = "전혀 그렇지 않다";
const RIGHT = "매우 그렇다";

const eiQuestions: Omit<SurveyQuestion, "id">[] = [
  { axis: "EI", text: "새로운 사람들과의 모임에서 먼저 말을 건네는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "EI", text: "생각을 정리할 때 다른 사람과 이야기하며 정리하는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "EI", text: "일정이 빡빡해도 사람을 만나고 나면 오히려 에너지가 차오른다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "EI", text: "낯선 자리에서도 먼저 나서서 분위기를 이끄는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "EI", text: "혼자 조용히 보내는 시간이 있어야 다음 활동을 할 힘이 생긴다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "EI", text: "여러 사람과 함께 있는 것보다 소수와 깊이 대화하는 쪽을 선호한다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "EI", text: "감정이나 생각을 말로 꺼내기 전에 충분히 혼자 정리하는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "EI", text: "즉흥적인 모임 제안보다 미리 계획된 소규모 만남이 더 편하다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "EI", text: "하루 종일 사람들과 함께 있으면 저녁엔 방전된 느낌이 든다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
];

const snQuestions: Omit<SurveyQuestion, "id">[] = [
  { axis: "SN", text: "계획을 세울 때 구체적인 사실과 데이터부터 확인한다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "SN", text: "새로운 일을 시작하기 전에 이전 사례나 경험을 먼저 참고한다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "SN", text: "지금 눈앞의 문제를 해결하는 실용적인 방법을 먼저 떠올린다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "SN", text: "설명을 들을 때 추상적인 개념보다 구체적인 예시가 더 와닿는다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "SN", text: "반복되는 익숙한 방식이라도 검증된 방법이면 그대로 따르는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "SN", text: "새로운 아이디어나 가능성을 떠올리는 데 자연스럽게 시간을 쓴다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "SN", text: "현재 상황보다 앞으로 어떻게 연결될지를 먼저 상상해보는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "SN", text: "기존 방식보다 더 나은 새로운 방식이 없을지 자꾸 궁리하게 된다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "SN", text: "여러 정보를 접하면 그 사이의 패턴이나 의미를 자연스럽게 연결짓는다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
];

const tfQuestions: Omit<SurveyQuestion, "id">[] = [
  { axis: "TF", text: "결정을 내릴 때 감정보다 객관적인 기준을 먼저 따진다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "TF", text: "문제의 원인을 분석하고 논리적으로 풀어내는 과정에 집중한다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "TF", text: "옳고 그름을 판단할 때 상황보다 원칙을 우선한다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "TF", text: "피드백을 줄 때 관계보다 정확한 지적을 우선하는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "TF", text: "결과를 평가할 때 효율과 성과를 가장 먼저 살핀다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "TF", text: "결정을 내릴 때 그 결정이 주변 사람들에게 미칠 영향을 먼저 생각한다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "TF", text: "논리적으로 맞더라도 상대의 감정이 상할 것 같으면 표현을 조율한다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "TF", text: "갈등 상황에서는 누가 옳은지보다 관계를 회복하는 쪽에 더 마음이 쓰인다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "TF", text: "상대방의 입장에 공감하는 것이 문제 해결만큼 중요하다고 느낀다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
];

const jpQuestions: Omit<SurveyQuestion, "id">[] = [
  { axis: "JP", text: "하루를 시작하기 전에 할 일의 순서를 미리 정리해두는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "JP", text: "마감 기한보다 미리 끝내두는 쪽이 마음이 편하다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "JP", text: "계획이 틀어지면 상당히 신경이 쓰이는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "JP", text: "결정을 내리면 그 이후로는 잘 바꾸지 않는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "JP", text: "정리되지 않은 상태보다 체계가 잡힌 상태에서 더 집중이 잘 된다.", leftLabel: LEFT, rightLabel: RIGHT, direction: 1 },
  { axis: "JP", text: "일정은 상황에 따라 유동적으로 바뀌어도 크게 개의치 않는다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "JP", text: "마감 직전에 오히려 집중력이 올라가는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "JP", text: "여러 선택지를 열어두었다가 마지막 순간에 결정하는 편이다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
  { axis: "JP", text: "계획대로 되지 않아도 그때그때 즉흥적으로 대응하는 데 익숙하다.", leftLabel: LEFT, rightLabel: RIGHT, direction: -1 },
];

/** 축이 연속되지 않도록 EI → SN → TF → JP 순으로 라운드로빈 배치 */
function interleave(): Omit<SurveyQuestion, "id">[] {
  const groups = [eiQuestions, snQuestions, tfQuestions, jpQuestions];
  const result: Omit<SurveyQuestion, "id">[] = [];
  for (let i = 0; i < 9; i++) {
    for (const g of groups) {
      result.push(g[i]);
    }
  }
  return result;
}

export const QUESTIONS: SurveyQuestion[] = interleave().map((q, index) => ({
  ...q,
  id: index + 1,
}));
