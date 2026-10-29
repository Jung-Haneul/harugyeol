import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { LearningNotesForm } from "@/features/learning-notes/learning-notes-form";

const fetchMock = vi.fn();
const writeText = vi.fn<(text: string) => Promise<void>>(async () => {});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function writeRecord(text: string) {
  fireEvent.change(screen.getByLabelText("놀이 기록"), { target: { value: text } });
}

function clickGenerate() {
  fireEvent.click(screen.getByRole("button", { name: "작성하기" }));
}

beforeEach(() => {
  fetchMock.mockReset();
  writeText.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("놀이 기록을 보내면 배움읽기와 배움지원 및 계획이 줄 단위로 나타난다", async () => {
  fetchMock.mockResolvedValue(
    jsonResponse({
      learningReading: ["지문을 관찰함", "도구를 탐색함"],
      learningSupport: ["돋보기를 제공함", "내일은 지문찾기를 지원해야겠음"],
    })
  );
  render(<LearningNotesForm />);

  writeRecord("지문 놀이를 함");
  clickGenerate();

  expect(await screen.findByLabelText("배움읽기")).toHaveValue("지문을 관찰함\n도구를 탐색함");
  expect(screen.getByLabelText("배움지원 및 계획")).toHaveValue(
    "돋보기를 제공함\n내일은 지문찾기를 지원해야겠음"
  );
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("/api/learning-notes");
  expect(JSON.parse(init.body)).toEqual({ playRecord: "지문 놀이를 함" });
});

test("기록이 비어 있으면 요청하지 않고 입력이 필요하다고 알려 준다", () => {
  render(<LearningNotesForm />);

  clickGenerate();

  expect(screen.getByText("놀이 기록을 입력해 주세요.")).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("생성 중에는 버튼이 막혀 같은 요청이 중복되지 않는다", async () => {
  let resolveFetch: (response: Response) => void = () => {};
  fetchMock.mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve)));
  render(<LearningNotesForm />);

  writeRecord("지문 놀이를 함");
  clickGenerate();

  const busyButton = await screen.findByRole("button", { name: /작성 중/ });
  expect(busyButton).toBeDisabled();
  fireEvent.click(busyButton);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  resolveFetch(jsonResponse({ learningReading: ["a"], learningSupport: ["b"] }));
  expect(await screen.findByLabelText("배움읽기")).toBeInTheDocument();
});

test("무료 한도를 넘으면 잠시 뒤 다시 시도하라고 알리고 입력은 그대로 둔다", async () => {
  fetchMock.mockResolvedValue(
    jsonResponse({ error: { code: "rate_limited", message: "quota" } }, 429)
  );
  render(<LearningNotesForm />);

  writeRecord("지문 놀이를 함");
  clickGenerate();

  expect(await screen.findByText(/잠시 뒤에 다시 시도/)).toBeInTheDocument();
  expect(screen.getByLabelText("놀이 기록")).toHaveValue("지문 놀이를 함");
  expect(screen.getByRole("button", { name: "작성하기" })).toBeEnabled();
});

test("그 밖의 실패와 네트워크 오류도 알리고 다시 시도할 수 있게 둔다", async () => {
  fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
  render(<LearningNotesForm />);

  writeRecord("지문 놀이를 함");
  clickGenerate();

  expect(await screen.findByText(/글을 만들지 못했습니다/)).toBeInTheDocument();
  expect(screen.getByLabelText("놀이 기록")).toHaveValue("지문 놀이를 함");
});

test("복사 버튼은 교사가 고친 글을 복사하고 복사됐음을 알린다", async () => {
  fetchMock.mockResolvedValue(
    jsonResponse({ learningReading: ["원래 글"], learningSupport: ["지원 글"] })
  );
  render(<LearningNotesForm />);
  writeRecord("지문 놀이를 함");
  clickGenerate();
  const reading = await screen.findByLabelText("배움읽기");

  fireEvent.change(reading, { target: { value: "고친 글" } });
  fireEvent.click(screen.getByRole("button", { name: "배움읽기 복사" }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith("고친 글"));
  expect(await screen.findByText("복사했습니다")).toBeInTheDocument();
});

test("두 덩어리는 따로 복사된다", async () => {
  fetchMock.mockResolvedValue(
    jsonResponse({ learningReading: ["읽기"], learningSupport: ["지원 1", "지원 2"] })
  );
  render(<LearningNotesForm />);
  writeRecord("지문 놀이를 함");
  clickGenerate();
  await screen.findByLabelText("배움지원 및 계획");

  fireEvent.click(screen.getByRole("button", { name: "배움지원 및 계획 복사" }));

  await waitFor(() => expect(writeText).toHaveBeenCalledWith("지원 1\n지원 2"));
  expect(writeText).toHaveBeenCalledTimes(1);
});
