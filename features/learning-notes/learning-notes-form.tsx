"use client";

import { useRef, useState } from "react";
import { CheckIcon, CopyIcon, Loader2Icon, SparklesIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

type SectionKey = "reading" | "support";

type Notes = Record<SectionKey, string> & { references: string[] };

const SECTIONS: { key: SectionKey; title: string }[] = [
  { key: "reading", title: "배움읽기" },
  { key: "support", title: "배움지원 및 계획" },
];

const EMPTY_RECORD_MESSAGE = "놀이 기록을 입력해 주세요.";
const RATE_LIMITED_MESSAGE =
  "무료 사용 한도를 넘었습니다. 잠시 뒤에 다시 시도해 주세요.";
const FAILED_MESSAGE = "글을 만들지 못했습니다. 입력한 기록은 그대로 있으니 다시 시도해 주세요.";

class NotesRequestError extends Error {}

async function requestNotes(playRecord: string): Promise<Notes> {
  const response = await fetch("/api/learning-notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ playRecord }),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const code = body?.error?.code;
    throw new NotesRequestError(code === "rate_limited" ? RATE_LIMITED_MESSAGE : FAILED_MESSAGE);
  }
  return {
    reading: (body.learningReading as string[]).join("\n"),
    support: (body.learningSupport as string[]).join("\n"),
    references: (body.references as string[] | undefined) ?? [],
  };
}

export function LearningNotesForm() {
  const [playRecord, setPlayRecord] = useState("");
  const [notes, setNotes] = useState<Notes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<SectionKey | null>(null);
  const inFlight = useRef(false);

  async function generate() {
    if (inFlight.current) return;
    if (playRecord.trim() === "") {
      setError(EMPTY_RECORD_MESSAGE);
      return;
    }

    inFlight.current = true;
    setPending(true);
    setError(null);
    setCopied(null);
    try {
      setNotes(await requestNotes(playRecord));
    } catch (e) {
      setError(e instanceof NotesRequestError ? e.message : FAILED_MESSAGE);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  async function copy(key: SectionKey) {
    if (!notes) return;
    await navigator.clipboard.writeText(notes[key]);
    setCopied(key);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>오늘의 놀이 기록</CardTitle>
          <CardDescription>
            아이들의 말과 행동을 있었던 그대로 적어 주세요. 이 기록을 바탕으로 배움읽기와 배움지원 및
            계획 초안을 씁니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="play-record">놀이 기록</FieldLabel>
            <Textarea
              id="play-record"
              className="min-h-40"
              value={playRecord}
              onChange={(event) => setPlayRecord(event.target.value)}
              placeholder={'예) 유아들이 저번주에 찍은 지문에 관심을 보임. oo이가 "이거 내 지문 같은데"라고 말하자 …'}
            />
            <FieldDescription>
              무료 AI 서비스로 글을 만들기 때문에, 입력한 내용이 외부 서비스로 전달됩니다.
            </FieldDescription>
          </Field>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button size="lg" onClick={generate} disabled={pending}>
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" data-icon="inline-start" />
                작성 중…
              </>
            ) : (
              <>
                <SparklesIcon data-icon="inline-start" />
                작성하기
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {notes && (
        <div className="flex flex-col gap-6" aria-live="polite">
          {SECTIONS.map(({ key, title }) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>읽고 고친 뒤 한글 일지에 붙여 넣으세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor={`notes-${key}`} className="sr-only">
                    {title}
                  </FieldLabel>
                  <Textarea
                    id={`notes-${key}`}
                    className="min-h-32"
                    value={notes[key]}
                    onChange={(event) => setNotes({ ...notes, [key]: event.target.value })}
                  />
                </Field>
              </CardContent>
              <CardFooter className="items-center justify-end gap-3">
                {copied === key && (
                  <span className="text-sm text-muted-foreground">복사했습니다</span>
                )}
                <Button variant="outline" onClick={() => copy(key)}>
                  {copied === key ? (
                    <CheckIcon data-icon="inline-start" />
                  ) : (
                    <CopyIcon data-icon="inline-start" />
                  )}
                  {title} 복사
                </Button>
              </CardFooter>
            </Card>
          ))}
          {notes.references.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>참고한 누리과정</CardTitle>
                <CardDescription>
                  글을 쓸 때 참고한 2019 개정 누리과정의 영역과 내용범주입니다. 복사되는 글에는
                  포함되지 않습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul aria-label="참고한 누리과정" className="flex flex-col gap-1 text-sm">
                  {notes.references.map((reference) => (
                    <li key={reference}>{reference}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
