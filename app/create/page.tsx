"use client";

// FS-01 캐릭터 생성 — Spring 백엔드 연동판.
// 관계+성별 → 자유 서술 → AI 인터뷰(백엔드가 질문·선택지 생성) → 이름/생일 →
// 컴파일(백엔드가 프로필+초상 후보 생성) → 카드 확인/수정 → 초상 선택 → 홈.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RELATIONSHIPS } from "@/lib/character";
import {
  backend,
  setActiveCharacterId,
  type CharacterDetail,
  type InterviewAnswer,
  type InterviewQuestion,
  type PhotoItem,
} from "@/lib/api";
import { Avatar, Progress, WizardBar, Body } from "../components";
import { Icon } from "../icons";

// 매크로 스텝: 0 관계 → 1 프롬프트 → 2 질문 → 3 이름/생일 → 4 컴파일 로딩 → 6 카드 → 5 초상 선택
export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [relationship, setRelationship] = useState<string | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [answers, setAnswers] = useState<InterviewAnswer[]>([]);
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [qLoading, setQLoading] = useState(false);
  const [customAnswer, setCustomAnswer] = useState("");

  const [name, setName] = useState("");
  const [birth, setBirth] = useState({ y: "", m: "", d: "" });
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 컴파일 결과
  const [compiled, setCompiled] = useState<CharacterDetail | null>(null);
  const [portraits, setPortraits] = useState<PhotoItem[]>([]);
  const [selectedPortrait, setSelectedPortrait] = useState<number | null>(null);
  const [editingCard, setEditingCard] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchQuestion(prev: InterviewAnswer[]) {
    if (!relationship || !gender) return;
    setQLoading(true);
    setQuestion(null);
    setCustomAnswer("");
    setError(null);
    try {
      const q = await backend.interview({
        relationshipType: relationship,
        gender,
        freeText: freeText.trim() || undefined,
        previousAnswers: prev,
      });
      if (q.done) {
        setStep(3); // 백엔드가 충분하다고 판단 → 이름/생일로
      } else {
        setQuestion(q);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "질문 생성 실패");
    } finally {
      setQLoading(false);
    }
  }

  function startInterview() {
    setStep(2);
    void fetchQuestion(answers);
  }

  function answer(picked: string) {
    if (!question) return;
    const next = [
      ...answers,
      { category: question.category, question: question.question, answer: picked },
    ];
    setAnswers(next);
    void fetchQuestion(next);
  }

  async function finish() {
    if (!relationship || !gender) return;
    const y = birth.y.padStart(4, "0");
    const m = birth.m.padStart(2, "0");
    const d = birth.d.padStart(2, "0");
    const birthday =
      parseInt(birth.y, 10) > 1900 && birth.m && birth.d ? `${y}-${m}-${d}` : undefined;
    setStep(4);
    setError(null);
    try {
      setLoadingMsg("답변을 바탕으로 프로필을 조립하는 중");
      const result = await backend.compile({
        relationshipType: relationship,
        gender,
        freeText: freeText.trim() || undefined,
        interviewAnswers: answers,
        name: name.trim(),
        birthday,
      });
      setCompiled(result.character);
      setPortraits(result.candidatePortraits);
      setActiveCharacterId(result.character.id);
      setStep(6); // 카드 확인
    } catch (e) {
      alert(
        `생성에 실패했어요. 다시 시도해주세요.\n${e instanceof Error ? e.message : ""}`,
      );
      setStep(3);
    }
  }

  // 카드 수정 반영 (백엔드 PATCH — 외모/성격/말투만 지원)
  async function finishCard() {
    if (!compiled) return;
    setSaving(true);
    try {
      await backend.updateCharacter(compiled.id, {
        appearance: compiled.appearance ?? undefined,
        personality: compiled.personality ?? undefined,
        speechStyles: compiled.speechStyles,
      });
    } catch {
      // 수정 저장 실패해도 초상 선택은 진행
    } finally {
      setSaving(false);
    }
    if (portraits.length > 0) setStep(5);
    else router.push("/home"); // 초상 후보가 없으면 (이미지 키 없음) 바로 홈
  }

  async function confirmPortrait() {
    if (!compiled) return;
    if (selectedPortrait !== null) {
      try {
        await backend.selectPortrait(compiled.id, selectedPortrait);
      } catch (e) {
        setError(e instanceof Error ? e.message : "초상 선택 실패");
        return;
      }
    }
    router.push("/home");
  }

  function setCardField(patch: Partial<CharacterDetail>) {
    setCompiled((c) => (c ? { ...c, ...patch } : c));
  }

  // ── step 6: 캐릭터 카드 (FS-02) — 정리해서 보여주고, 수정 가능 ──
  if (step === 6 && compiled) {
    const c = compiled;
    const field = (
      label: string,
      value: string,
      key: "appearance" | "personality",
      rows = 2,
    ) => (
      <div style={{ marginBottom: 16 }}>
        <div className="label1" style={{ marginBottom: 6, color: "var(--gray-700)" }}>
          {label}
        </div>
        {editingCard ? (
          <textarea
            className="input"
            style={{ height: rows * 26 + 20, resize: "none", lineHeight: 1.55 }}
            value={value}
            onChange={(e) => setCardField({ [key]: e.target.value })}
          />
        ) : (
          <div className="body2" style={{ color: "var(--gray-600)", lineHeight: 1.6 }}>
            {value}
          </div>
        )}
      </div>
    );

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div className="topbar">
          <span className="headline1">이런 사람이에요</span>
          <button
            className="nav-btn"
            style={{
              color: editingCard ? "var(--orange-700)" : "var(--gray-500)",
              fontWeight: 700,
            }}
            onClick={() => setEditingCard((v) => !v)}
          >
            {editingCard ? "완료" : (
              <>
                <Icon name="edit-small" size={14} style={{ verticalAlign: "-2px", marginRight: 3 }} />수정
              </>
            )}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
          {/* 프로필 헤더 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
            <Avatar emoji="✨" src={c.profileImageUrl ?? undefined} size={140} radius={20} />
            <div className="h2" style={{ marginTop: 14 }}>
              {c.name}
            </div>
            <div className="body2" style={{ color: "var(--gray-500)", marginTop: 4 }}>
              {c.relationshipType} · {c.age} · {c.gender}
            </div>
          </div>

          {/* 한 줄 요약 (강조) */}
          {c.summary && (
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: "var(--orange-50)",
                border: "1px solid var(--orange-200)",
                marginBottom: 20,
              }}
            >
              <div className="headline2" style={{ color: "var(--orange-700)", fontWeight: 700, lineHeight: 1.5 }}>
                “{c.summary}”
              </div>
            </div>
          )}

          {field("외모", c.appearance ?? "", "appearance", 3)}
          {field("성격", c.personality ?? "", "personality", 3)}

          {/* 말투 */}
          <div style={{ marginBottom: 16 }}>
            <div className="label1" style={{ marginBottom: 6, color: "var(--gray-700)" }}>
              말투
            </div>
            {editingCard ? (
              <textarea
                className="input"
                style={{ height: 84, resize: "none", lineHeight: 1.55 }}
                value={c.speechStyles.join("\n")}
                onChange={(e) =>
                  setCardField({
                    speechStyles: e.target.value.split("\n").filter((x) => x.trim()),
                  })
                }
              />
            ) : (
              <div className="chip-row">
                {c.speechStyles.map((q) => (
                  <span key={q} className="chip" style={{ cursor: "default" }}>
                    {q}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 20 }}>
          <button
            className="cta"
            disabled={editingCard || saving}
            onClick={() => void finishCard()}
          >
            {editingCard
              ? "수정 끝나면 완료를 눌러주세요"
              : saving
                ? "저장 중…"
                : portraits.length > 0
                  ? "마음에 드는 사진 고르러 가기 →"
                  : "이 캐릭터로 시작하기 →"}
          </button>
        </div>
      </div>
    );
  }

  // ── step 4: 컴파일 로딩 ──
  if (step === 4) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: "100dvh",
          background:
            "linear-gradient(180deg, var(--orange-50) 0%, #fff 62%, var(--orange-500) 140%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          padding: 20,
        }}
      >
        <div className="fade-in">
          <Avatar emoji="✨" size={300} radius={20} />
        </div>
        <div className="logo" style={{ fontSize: 24, color: "var(--gray-600)" }}>
          Draw Your Character...
        </div>
        <div className="caption" style={{ color: "var(--gray-500)" }}>
          {loadingMsg}
        </div>
      </div>
    );
  }

  // ── step 5: 초상 후보 중 고르기 (백엔드 candidatePortraits) ──
  if (step === 5) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <div style={{ padding: "20px 20px 8px" }}>
          <h1 className="h2" style={{ margin: 0 }}>
            마음에 드는 사진을 골라주세요
          </h1>
          <div className="body2" style={{ color: "var(--gray-500)", marginTop: 4 }}>
            {name}의 첫 사진이 돼요
          </div>
        </div>

        <div style={{ flex: 1, padding: "8px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {portraits.map((p) => {
              const on = selectedPortrait === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPortrait(p.id)}
                  style={{
                    padding: 0,
                    border: on
                      ? "3px solid var(--orange-700)"
                      : "3px solid transparent",
                    borderRadius: 14,
                    overflow: "hidden",
                    cursor: "pointer",
                    background: "none",
                    position: "relative",
                    transition: "border-color 200ms var(--ease)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt=""
                    style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
                  />
                  {on && (
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "var(--orange-700)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                      }}
                    >
                      <Icon name="check" size={14} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {error && (
            <div className="caption" style={{ color: "#d64545", textAlign: "center", marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            className="cta"
            disabled={selectedPortrait === null}
            onClick={() => void confirmPortrait()}
          >
            이 사진으로 시작
          </button>
          <button
            onClick={() => router.push("/home")}
            style={{
              border: "none",
              background: "none",
              color: "var(--gray-400)",
              fontFamily: "inherit",
              fontSize: 13,
              cursor: "pointer",
              padding: 4,
            }}
          >
            나중에 정할래요
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <WizardBar
        showPrev={step > 0}
        onPrev={() => {
          if (step === 2) setStep(1);
          else if (step === 3) setStep(2);
          else setStep(step - 1);
        }}
        onNext={
          step === 0
            ? () => setStep(1)
            : step === 1
              ? startInterview
              : undefined
        }
        nextDisabled={step === 0 && (!relationship || !gender)}
      />

      <Body>
        {/* ── 0. 관계 + 성별 ── */}
        {step === 0 && (
          <>
            <h1 className="h2" style={{ margin: "0 0 4px" }}>
              어떤 관계로 시작할까요?
            </h1>
            <Progress step={0} />
            {RELATIONSHIPS.map((r) => (
              <button
                key={r}
                className={`select-card ${relationship === r ? "selected" : ""}`}
                onClick={() => setRelationship(r)}
              >
                {r}
                <span className="check"><Icon name="check" size={16} /></span>
              </button>
            ))}

            <div className="label1" style={{ margin: "24px 0 12px" }}>
              그 사람의 성별은?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["여성", "남성", "기타"].map((g) => (
                <button
                  key={g}
                  className={`chip ${gender === g ? "selected" : ""}`}
                  style={{ flex: 1, borderRadius: 10, padding: "14px 0" }}
                  onClick={() => setGender(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── 1. 시작 프롬프트 ── */}
        {step === 1 && (
          <>
            <h1 className="h2" style={{ margin: "0 0 4px" }}>
              어떤 사람이었으면 해요?
            </h1>
            <Progress step={1} />
            <div className="body2" style={{ color: "var(--gray-500)", margin: "8px 0 12px" }}>
              자유롭게 묘사해주세요. 부족한 부분은 AI가 물어봐요.
              <br />
              건너뛰면 처음부터 골라가며 만들 수 있어요.
            </div>
            <textarea
              className="input"
              style={{ height: 160, resize: "none", lineHeight: 1.6 }}
              placeholder={
                "예: 무심한데 나한테만 다정한 연상. 밤에 통화하는 거 좋아하고, 골목 안 작은 바에서 일해요. 웃을 때 눈이 접히는 강아지상이면 좋겠어요"
              }
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
            />
            <button className="cta" style={{ marginTop: 16 }} onClick={startInterview}>
              {freeText.trim() ? "다음" : "건너뛰고 골라볼래요"}
            </button>
          </>
        )}

        {/* ── 2. AI 인터뷰 (백엔드가 질문·선택지 생성) ── */}
        {step === 2 && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <h1 className="h2" style={{ margin: "0 0 4px" }}>
                {question?.category ?? "AI 인터뷰"}
              </h1>
              <span className="caption" style={{ color: "var(--gray-500)" }}>
                {answers.length}개 답변
              </span>
            </div>
            <Progress step={2} />

            {/* 질문 생성 로딩 스켈레톤 */}
            {qLoading && (
              <div className="fade-in" style={{ marginTop: 12 }}>
                <div className="skeleton" style={{ height: 26, width: "72%", marginBottom: 20 }} />
                <div className="skeleton" style={{ height: 62, borderRadius: 12, marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 62, borderRadius: 12, marginBottom: 10 }} />
                <div className="skeleton" style={{ height: 62, borderRadius: 12, width: "60%" }} />
              </div>
            )}

            {error && !qLoading && (
              <div className="caption" style={{ color: "#d64545", margin: "12px 0" }}>
                {error} — <button className="nav-btn" style={{ display: "inline" }} onClick={() => void fetchQuestion(answers)}>다시 시도</button>
              </div>
            )}

            {question && !qLoading && (
              <div className="fade-in" key={question.question}>
                <div className="headline1" style={{ margin: "12px 0 16px" }}>
                  {question.question}
                </div>

                {question.suggestedAnswers.length <= 2 ? (
                  // A/B 카드
                  question.suggestedAnswers.map((text, i) => (
                    <button
                      key={text}
                      className="select-card"
                      style={{ padding: "22px 20px" }}
                      onClick={() => answer(text)}
                    >
                      <span style={{ textAlign: "left", lineHeight: 1.5 }}>
                        <b style={{ color: "var(--orange-700)", marginRight: 8 }}>
                          {i === 0 ? "A" : "B"}
                        </b>
                        {text}
                      </span>
                    </button>
                  ))
                ) : (
                  // 여러 선택지 그리드
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 4,
                    }}
                  >
                    {question.suggestedAnswers.map((text) => (
                      <button
                        key={text}
                        className="select-card"
                        style={{
                          padding: "18px 14px",
                          marginBottom: 0,
                          justifyContent: "center",
                          textAlign: "center",
                        }}
                        onClick={() => answer(text)}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                )}

                {/* 직접 입력 */}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    style={{ flex: 1, borderRadius: 999 }}
                    placeholder="직접 입력해도 돼요"
                    value={customAnswer}
                    onChange={(e) => setCustomAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.nativeEvent.isComposing &&
                        customAnswer.trim()
                      ) {
                        answer(customAnswer.trim());
                      }
                    }}
                  />
                  <button
                    className="send-btn"
                    disabled={!customAnswer.trim()}
                    onClick={() => customAnswer.trim() && answer(customAnswer.trim())}
                  >
                    <Icon name="send" size={18} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <button className="cta" onClick={() => setStep(3)}>
                이 정도면 됐어요 →
              </button>
              <div
                className="caption"
                style={{ textAlign: "center", color: "var(--gray-400)", marginTop: 8 }}
              >
                원하는 만큼 답하고 언제든 넘어가세요
              </div>
            </div>
          </>
        )}

        {/* ── 3. 이름/생일 ── */}
        {step === 3 && (
          <>
            <h1 className="h2" style={{ margin: "0 0 4px" }}>
              마지막이에요
            </h1>
            <Progress step={3} />
            {gender && (
              <div className="body2" style={{ color: "var(--gray-500)", margin: "8px 0 4px" }}>
                {relationship} · {gender} 캐릭터의 이름을 지어주세요
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: "14px 10px", alignItems: "center", marginTop: 12 }}>
              <span className="label1">이름</span>
              <input
                className="input"
                placeholder="캐릭터 이름"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <span className="label1">생일</span>
              <div style={{ display: "flex", gap: 8 }}>
                {(["y", "m", "d"] as const).map((k) => (
                  <input
                    key={k}
                    className="input"
                    style={{ textAlign: "center" }}
                    placeholder={k === "y" ? "0000" : "00"}
                    maxLength={k === "y" ? 4 : 2}
                    inputMode="numeric"
                    value={birth[k]}
                    onChange={(e) =>
                      setBirth({ ...birth, [k]: e.target.value.replace(/\D/g, "") })
                    }
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </Body>

      {step === 3 && (
        <div style={{ padding: 20 }}>
          <button
            className="cta"
            disabled={!name.trim()}
            onClick={() => void finish()}
          >
            생성
          </button>
        </div>
      )}
    </div>
  );
}
