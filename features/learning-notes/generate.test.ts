import { describe, expect, test, vi } from "vitest";

import {
  generateLearningNotes,
  GenerationError,
  type GeminiLike,
} from "@/features/learning-notes/generate";

function clientReturning(outputText: string) {
  const create = vi.fn<GeminiLike["interactions"]["create"]>(async () => ({
    output_text: outputText,
  }));
  const client: GeminiLike = { interactions: { create } };
  return { client, create };
}

function clientRejecting(error: unknown): GeminiLike {
  return {
    interactions: {
      create: async () => {
        throw error;
      },
    },
  };
}

const RECORD = "유아들이 지문에 관심을 보임. oo이가 \"이거 내 지문 같은데\"라고 말함.";

describe("generateLearningNotes", () => {
  test("모델 응답을 배움읽기와 배움지원 및 계획의 줄 목록으로 돌려준다", async () => {
    const { client } = clientReturning(
      JSON.stringify({
        learning_reading: ["지문을 관찰하며 탐구를 즐김", "도구로 특성을 탐색함"],
        learning_support: ["돋보기를 제공함", "내일은 지문찾기 놀이를 지원해야겠음"],
      })
    );

    const result = await generateLearningNotes(RECORD, client);

    expect(result).toEqual({
      learningReading: ["지문을 관찰하며 탐구를 즐김", "도구로 특성을 탐색함"],
      learningSupport: ["돋보기를 제공함", "내일은 지문찾기 놀이를 지원해야겠음"],
    });
  });

  test("교사가 쓴 놀이 기록을 모델 입력에 그대로 담아 보낸다", async () => {
    const { client, create } = clientReturning(
      JSON.stringify({ learning_reading: ["a"], learning_support: ["b"] })
    );

    await generateLearningNotes(`  ${RECORD}  `, client);

    const request = create.mock.calls[0][0] as { input: string; system_instruction: string };
    expect(request.input).toContain(RECORD);
    expect(request.system_instruction).toContain("의사소통");
    expect(request.system_instruction).toContain("자연탐구");
  });

  test("기록이 비어 있으면 모델을 부르지 않고 empty_record 오류를 낸다", async () => {
    const { client, create } = clientReturning("{}");

    await expect(generateLearningNotes("   ", client)).rejects.toMatchObject({
      code: "empty_record",
    });
    expect(create).not.toHaveBeenCalled();
  });

  test("무료 한도 초과(429)는 rate_limited 오류로 구분한다", async () => {
    const client = clientRejecting(Object.assign(new Error("quota"), { status: 429 }));

    await expect(generateLearningNotes(RECORD, client)).rejects.toMatchObject({
      code: "rate_limited",
    });
  });

  test("그 밖의 모델 오류는 generation_failed 오류로 낸다", async () => {
    const client = clientRejecting(new Error("network down"));

    const error = await generateLearningNotes(RECORD, client).catch((e) => e);

    expect(error).toBeInstanceOf(GenerationError);
    expect(error.code).toBe("generation_failed");
  });

  test.each([
    ["JSON이 아닌 응답", "그냥 글"],
    ["필드가 빠진 응답", JSON.stringify({ learning_reading: ["a"] })],
    ["빈 줄 목록 응답", JSON.stringify({ learning_reading: [], learning_support: ["b"] })],
  ])("%s이면 generation_failed 오류를 낸다", async (_name, outputText) => {
    const { client } = clientReturning(outputText);

    await expect(generateLearningNotes(RECORD, client)).rejects.toMatchObject({
      code: "generation_failed",
    });
  });
});
