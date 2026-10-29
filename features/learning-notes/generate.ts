import { CURRICULUM, REFERENCE_LABELS } from "@/features/learning-notes/curriculum";

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
  /** 글을 쓸 때 참고한 누리과정의 "영역 > 내용범주". 참고 목록에 있는 항목만 담긴다. */
  references: string[];
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

근거로 삼는 틀은 2019 개정 누리과정의 5개 영역과 내용범주입니다.
${CURRICULUM.map(({ area, categories }) => `- ${area}: ${categories.join(", ")}`).join("\n")}
놀이 기록에 가장 잘 맞는 영역과 내용범주를 스스로 골라 그 관점으로 배움을 읽습니다. 글에 영역 이름은 쓰지 않습니다.
참고한 항목은 curriculum_references에 "영역 > 내용범주" 형태로 1~3개 담습니다. 아래 목록에 있는 항목만 쓸 수 있습니다.
${REFERENCE_LABELS.map((label) => `- ${label}`).join("\n")}

규칙
- 놀이 기록에 나온 내용에만 근거합니다. 기록에 없는 아이의 말이나 행동을 지어내지 않습니다.
- 어린이집 보육일지의 문체인 개조식으로 씁니다. 문장은 "~함", "~알아봄", "~즐김"처럼 끝냅니다.
- learning_reading은 아이들이 무엇을 배우고 있는지 해석한 3~5줄입니다. 놀이 기록에 나온 아이들의 말과 행동을 짚어 가며, 무엇을 알고 어떻게 탐색하고 어떤 태도를 보였는지를 구체적으로 풀어 씁니다.
- learning_support는 교사가 한 지원 2~4줄과, 마지막 줄에 다음 날 이어갈 계획을 담은 3~5줄입니다. 지원은 어떤 도구, 자료, 질문, 환경으로 어떻게 도왔는지 구체적으로 쓰고, 마지막 줄은 "~해야겠음"으로 끝냅니다.
- 한 줄은 한 문장이며, 문장 하나에 한 가지 내용을 충분히 담아 길이를 채웁니다(대략 40~80자). 번호나 글머리표를 붙이지 않습니다.
- learning_reading과 learning_support는 각각 반드시 3줄 이상 씁니다. 줄이 짧거나 두 줄로 끝나면 안 됩니다.
- 분량은 새로운 사실을 더해서가 아니라, 기록에 나온 같은 사실을 여러 관점(무엇을 했는지, 무엇을 알게 되었는지, 어떤 태도를 보였는지)으로 풀어 쓰며 채웁니다.
- 기록에 없는 소재, 물건, 활동, 사람은 쓰지 않습니다. 아래 예시의 내용(지문 등)도 놀이 기록에 나오지 않았다면 쓰지 않습니다.
- 따옴표로 인용하는 아이의 말은 놀이 기록에 적힌 그대로만 씁니다. 기록에 없는 말을 만들어 인용하지 않습니다.
- 교사가 한 지원도 기록에 나오지 않았다면 사실처럼 단정하지 않고, 기록에 나온 아이들의 모습을 지지하고 격려하는 일반적인 지원으로 씁니다.
- 글에 근거가 있는 항목만 curriculum_references에 담습니다.

예시
놀이 기록: 유아들이 저번주에 찍은 지문에 관심을 보이며 지속적으로 호기심을 보임. oo이가 "이거 내 지문 같은데"라고 말하자 xx이가 "아니야 이게 oo 너 지문이잖아"라고 말하며 자신의 지문을 찾으며 놀이함.
learning_reading:
- 유아들이 자신의 지문에 관심을 보이며 궁금한 것을 탐구하는 과정을 즐기고 자발적으로 놀이에 참여함
- 지문을 눈으로 보는 데 그치지 않고 돋보기와 스탬프를 이용해 관찰하며 물체의 특성을 알아보는 방법이 여러 가지임을 알고 탐색함
- 나와 또래의 지문을 서로 견주어 보며 "이게 너 지문이잖아"처럼 자신의 지문을 찾아내고 구별하는 경험을 함
- 지문의 종류와 이름을 알고 찾아보며 몰랐던 지식에 대한 새로운 배움이 일어남
learning_support:
- 유아들이 지문을 눈으로 관찰할 뿐만 아니라 돋보기, 스탬프찍기로 다양하게 알아볼 수 있도록 도구를 충분히 제공함
- 또래의 지문과 비교하며 이야기 나누는 모습을 지켜보고 유아의 말에 귀 기울이며 궁금함을 이어갈 수 있도록 지지함
- 유아들이 지문 관찰 놀이를 확장해 갈 수 있도록 지문의 이름과 종류에 대한 그림책과 자료를 지원함
- 내일은 자신의 지문을 직접 찾아보는 지문찾기 놀이를 지원해주어야겠음`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    learning_reading: {
      type: "array",
      items: { type: "string" },
      description: "배움읽기. 개조식 3~5줄.",
    },
    learning_support: {
      type: "array",
      items: { type: "string" },
      description: "배움지원 및 계획. 개조식 3~5줄, 마지막 줄은 다음 날 계획.",
    },
    curriculum_references: {
      type: "array",
      items: { type: "string", enum: REFERENCE_LABELS },
      description: "글을 쓸 때 참고한 누리과정의 영역 > 내용범주 1~3개.",
    },
  },
  required: ["learning_reading", "learning_support", "curriculum_references"],
};

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((line) => typeof line === "string" && line.trim() !== "")
  );
}

function pickKnownReferences(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const known = value.filter(
    (label): label is string => typeof label === "string" && REFERENCE_LABELS.includes(label)
  );
  return [...new Set(known)];
}

const QUOTE_PATTERN = /["“”]([^"“”]+)["“”]/g;

/** 따옴표로 인용한 말이 모두 놀이 기록에 있는 줄만 남긴다(모델이 지어낸 대사를 걸러낸다). */
function keepGroundedLines(lines: string[], record: string): string[] {
  return lines.filter((line) =>
    [...line.matchAll(QUOTE_PATTERN)].every(([, quoted]) => record.includes(quoted.trim()))
  );
}

function parseNotes(outputText: string | null | undefined, record: string): LearningNotes {
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText ?? "");
  } catch {
    throw new GenerationError("generation_failed", "모델 응답이 JSON이 아닙니다.");
  }

  const { learning_reading, learning_support, curriculum_references } = (parsed ?? {}) as Record<
    string,
    unknown
  >;
  if (!isStringList(learning_reading) || !isStringList(learning_support)) {
    throw new GenerationError("generation_failed", "모델 응답에 필요한 항목이 없습니다.");
  }

  const learningReading = keepGroundedLines(
    learning_reading.map((line) => line.trim()),
    record
  );
  const learningSupport = keepGroundedLines(
    learning_support.map((line) => line.trim()),
    record
  );
  if (learningReading.length === 0 || learningSupport.length === 0) {
    throw new GenerationError("generation_failed", "기록에 없는 내용만 담긴 응답입니다.");
  }

  return {
    learningReading,
    learningSupport,
    references: pickKnownReferences(curriculum_references),
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

  return parseNotes(outputText, record);
}
