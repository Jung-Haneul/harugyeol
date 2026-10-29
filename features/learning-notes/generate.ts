export type GenerationErrorCode =
  | "empty_record"
  | "rate_limited"
  | "generation_failed"
  | "not_configured";

export class GenerationError extends Error {
  constructor(
    readonly code: GenerationErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "GenerationError";
  }
}

export type LearningNotes = {
  learningReading: string[];
  learningSupport: string[];
};

/** `@google/genai` 클라이언트 중 이 기능이 쓰는 부분만 좁혀 둔 형태. */
export type GeminiLike = {
  interactions: {
    create(request: Record<string, unknown>): Promise<{ output_text?: string | null }>;
  };
};

export const DEFAULT_MODEL = "gemini-3.8-flash";

const SYSTEM_INSTRUCTION = `당신은 어린이집 교사의 주간 보육일지 작성을 돕는 도우미입니다.
교사가 쓴 하루 놀이 기록을 읽고, 일지의 "배움읽기"와 "배움지원 및 계획" 초안을 씁니다.

근거로 삼는 틀은 2019 개정 누리과정의 5개 영역입니다.
- 신체운동·건강
- 의사소통
- 사회관계
- 예술경험
- 자연탐구
놀이 기록에 가장 잘 맞는 영역을 스스로 골라 그 영역의 관점으로 배움을 읽습니다. 글에 영역 이름은 쓰지 않습니다.

규칙
- 놀이 기록에 나온 내용에만 근거합니다. 기록에 없는 아이의 말이나 행동을 지어내지 않습니다.
- 어린이집 보육일지의 문체인 개조식으로 씁니다. 문장은 "~함", "~알아봄", "~즐김"처럼 끝냅니다.
- learning_reading은 아이들이 무엇을 배우고 있는지 해석한 2~3줄입니다.
- learning_support는 교사가 한 지원 2줄과, 마지막 줄에 다음 날 이어갈 계획을 담은 2~3줄입니다. 마지막 줄은 "~해야겠음"으로 끝냅니다.
- 한 줄은 한 문장입니다. 번호나 글머리표를 붙이지 않습니다.

예시
놀이 기록: 유아들이 저번주에 찍은 지문에 관심을 보이며 지속적으로 호기심을 보임. oo이가 "이거 내 지문 같은데"라고 말하자 xx이가 "아니야 이게 oo 너 지문이잖아"라고 말하며 자신의 지문을 찾으며 놀이함.
learning_reading:
- 유아들이 자신의 지문에 관심을 보이며 궁금한 것을 탐구하는 과정을 즐기고 자발적으로 참여함
- 지문을 돋보기와 스탬프를 이용해 관찰하며 물체의 특성에 여러 가지 방법이 있음을 알고 탐색함
- 나와 또래의 지문의 종류와 이름을 알고 찾아보며 몰랐던 지식에 대한 배움이 일어남
learning_support:
- 유아들이 지문을 눈으로 관찰할 뿐만 아니라 돋보기, 스탬프찍기로 알아볼 수 있도록 도구를 제공함
- 유아들이 지문 관찰 놀이를 확장하여 지문의 이름과 종류에 대한 자료를 지원함
- 내일은 지문찾기 놀이를 지원해주어야겠음`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    learning_reading: {
      type: "array",
      items: { type: "string" },
      description: "배움읽기. 개조식 2~3줄.",
    },
    learning_support: {
      type: "array",
      items: { type: "string" },
      description: "배움지원 및 계획. 개조식 2~3줄, 마지막 줄은 다음 날 계획.",
    },
  },
  required: ["learning_reading", "learning_support"],
};

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((line) => typeof line === "string" && line.trim() !== "")
  );
}

function parseNotes(outputText: string | null | undefined): LearningNotes {
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText ?? "");
  } catch {
    throw new GenerationError("generation_failed", "모델 응답이 JSON이 아닙니다.");
  }

  const { learning_reading, learning_support } = (parsed ?? {}) as Record<string, unknown>;
  if (!isStringList(learning_reading) || !isStringList(learning_support)) {
    throw new GenerationError("generation_failed", "모델 응답에 필요한 항목이 없습니다.");
  }

  return {
    learningReading: learning_reading.map((line) => line.trim()),
    learningSupport: learning_support.map((line) => line.trim()),
  };
}

export async function generateLearningNotes(
  playRecord: string,
  client: GeminiLike,
  model: string = DEFAULT_MODEL
): Promise<LearningNotes> {
  const record = playRecord.trim();
  if (record === "") {
    throw new GenerationError("empty_record", "놀이 기록을 입력해 주세요.");
  }

  let outputText: string | null | undefined;
  try {
    const interaction = await client.interactions.create({
      model,
      system_instruction: SYSTEM_INSTRUCTION,
      input: `놀이 기록: ${record}`,
      generation_config: { thinking_level: "low" },
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: RESPONSE_SCHEMA,
      },
    });
    outputText = interaction.output_text;
  } catch (error) {
    if ((error as { status?: number } | null)?.status === 429) {
      throw new GenerationError("rate_limited", "무료 사용 한도를 넘었습니다.");
    }
    throw new GenerationError("generation_failed", "글을 만들지 못했습니다.");
  }

  return parseNotes(outputText);
}
