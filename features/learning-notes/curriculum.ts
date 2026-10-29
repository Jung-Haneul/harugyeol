/**
 * 2019 개정 누리과정의 영역과 내용범주.
 * 공개 자료에서 확인한 값이며 교육부 고시문 원문과 대조하지 못했다(스펙의 "누리과정 참고 목록").
 */
export const CURRICULUM = [
  {
    area: "신체운동·건강",
    categories: ["신체활동 즐기기", "건강하게 생활하기", "안전하게 생활하기"],
  },
  {
    area: "의사소통",
    categories: ["듣기와 말하기", "읽기와 쓰기에 관심 가지기", "책과 이야기 즐기기"],
  },
  {
    area: "사회관계",
    categories: ["나를 알고 존중하기", "더불어 생활하기", "사회에 관심 가지기"],
  },
  {
    area: "예술경험",
    categories: ["아름다움 찾아보기", "창의적으로 표현하기", "예술감상하기"],
  },
  {
    area: "자연탐구",
    categories: ["탐구과정 즐기기", "생활 속에서 탐구하기", "자연과 더불어 살기"],
  },
] as const;

/** "영역 > 내용범주" 형태의 표시용 이름 15개. */
export const REFERENCE_LABELS: string[] = CURRICULUM.flatMap(({ area, categories }) =>
  categories.map((category) => `${area} > ${category}`)
);
