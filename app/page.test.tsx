import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import Home from "@/app/page";

test("홈 화면은 놀이 기록 입력칸과 작성하기 버튼을 보여준다", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { level: 1, name: "배움읽기·배움지원 작성" })
  ).toBeInTheDocument();
  expect(screen.getByLabelText("놀이 기록")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "작성하기" })).toBeInTheDocument();
});
