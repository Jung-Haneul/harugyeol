import { LearningNotesForm } from "@/features/learning-notes/learning-notes-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
          배움읽기·배움지원 작성
        </h1>
        <p className="text-muted-foreground">
          오늘의 놀이 기록을 쓰면, 누리과정 영역에 맞춰 배움읽기와 배움지원 및 계획 초안을 써 드립니다.
        </p>
      </header>
      <LearningNotesForm />
    </main>
  );
}
