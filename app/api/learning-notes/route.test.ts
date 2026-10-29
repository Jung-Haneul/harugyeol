import { afterEach, beforeEach, expect, test, vi } from "vitest";

const create = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    interactions = { create };
  },
}));

import { POST } from "@/app/api/learning-notes/route";

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/learning-notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  create.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

test("놀이 기록을 받아 배움읽기와 배움지원 및 계획을 돌려준다", async () => {
  create.mockResolvedValue({
    output_text: JSON.stringify({
      learning_reading: ["읽기"],
      learning_support: ["지원"],
      curriculum_references: ["자연탐구 > 탐구과정 즐기기"],
    }),
  });

  const response = await post({ playRecord: "지문 놀이" });

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    learningReading: ["읽기"],
    learningSupport: ["지원"],
    references: ["자연탐구 > 탐구과정 즐기기"],
  });
});

test("놀이 기록이 비어 있으면 400과 empty_record를 돌려준다", async () => {
  const response = await post({ playRecord: "  " });

  expect(response.status).toBe(400);
  expect((await response.json()).error.code).toBe("empty_record");
  expect(create).not.toHaveBeenCalled();
});

test("무료 한도를 넘으면 429와 rate_limited를 돌려준다", async () => {
  create.mockRejectedValue(Object.assign(new Error("quota"), { status: 429 }));

  const response = await post({ playRecord: "지문 놀이" });

  expect(response.status).toBe(429);
  expect((await response.json()).error.code).toBe("rate_limited");
});

test("모델 호출이 실패하면 502와 generation_failed를 돌려준다", async () => {
  create.mockRejectedValue(new Error("boom"));

  const response = await post({ playRecord: "지문 놀이" });

  expect(response.status).toBe(502);
  expect((await response.json()).error.code).toBe("generation_failed");
});

test("API 키가 없으면 500과 not_configured를 돌려주고 모델을 부르지 않는다", async () => {
  vi.stubEnv("GEMINI_API_KEY", "");

  const response = await post({ playRecord: "지문 놀이" });

  expect(response.status).toBe(500);
  expect((await response.json()).error.code).toBe("not_configured");
  expect(create).not.toHaveBeenCalled();
});

test("본문이 JSON이 아니거나 playRecord가 문자열이 아니면 400을 돌려준다", async () => {
  const notJson = await POST(
    new Request("http://localhost/api/learning-notes", { method: "POST", body: "oops" })
  );
  const wrongType = await post({ playRecord: 3 });

  expect(notJson.status).toBe(400);
  expect(wrongType.status).toBe(400);
});
