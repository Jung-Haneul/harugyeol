import { GoogleGenAI } from "@google/genai";

import {
  DEFAULT_MODEL,
  generateLearningNotes,
  GenerationError,
  type GenerationErrorCode,
} from "@/features/learning-notes/generate";

const STATUS_BY_CODE: Record<GenerationErrorCode, number> = {
  empty_record: 400,
  rate_limited: 429,
  generation_failed: 502,
  not_configured: 500,
};

function errorResponse(code: GenerationErrorCode, message: string) {
  return Response.json({ error: { code, message } }, { status: STATUS_BY_CODE[code] });
}

export async function POST(request: Request) {
  let playRecord: unknown;
  try {
    ({ playRecord } = await request.json());
  } catch {
    return errorResponse("empty_record", "놀이 기록을 입력해 주세요.");
  }
  if (typeof playRecord !== "string") {
    return errorResponse("empty_record", "놀이 기록을 입력해 주세요.");
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return errorResponse("not_configured", "서버에 API 키가 설정되지 않았습니다.");
  }

  try {
    const client = new GoogleGenAI({ apiKey });
    const notes = await generateLearningNotes(
      playRecord,
      client,
      process.env.GEMINI_MODEL || DEFAULT_MODEL
    );
    return Response.json(notes);
  } catch (error) {
    if (error instanceof GenerationError) {
      return errorResponse(error.code, error.message);
    }
    return errorResponse("generation_failed", "글을 만들지 못했습니다.");
  }
}
