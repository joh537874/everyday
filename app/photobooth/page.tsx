"use client";

// FS-05 포토부스 — Spring 백엔드 연동판 (figma 사진 찍기).
// 컨셉 카탈로그(GET /api/photo/concepts) + 생성(POST /api/characters/{id}/photos, 포인트 차감).

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  backend,
  getActiveCharacterId,
  setActiveCharacterId,
  type CharacterSummary,
  type PhotoConcept,
} from "@/lib/api";
import { Avatar } from "../components";
import { Icon } from "../icons";

export default function PhotoboothPage() {
  const router = useRouter();
  const [char, setChar] = useState<CharacterSummary | null>(null);
  const [concepts, setConcepts] = useState<PhotoConcept[]>([]);
  const [concept, setConcept] = useState<PhotoConcept | null>(null);
  const [desc, setDesc] = useState("");
  const [points, setPoints] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await backend.listCharacters();
        if (list.length === 0) {
          router.replace("/create");
          return;
        }
        const activeId = getActiveCharacterId();
        const active = list.find((c) => c.id === activeId) ?? list[0];
        setActiveCharacterId(active.id);
        setChar(active);
        const [conceptList, me] = await Promise.all([
          backend.listPhotoConcepts(),
          backend.getMe(),
        ]);
        setConcepts(conceptList);
        setConcept(conceptList[0] ?? null);
        setPoints(me.points);
      } catch (e) {
        setError(e instanceof Error ? e.message : "백엔드 연결 실패");
      }
    })();
  }, [router]);

  async function generate() {
    if (busy || !char || !concept) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const gen = await backend.generatePhoto(char.id, {
        concept: concept.code,
        customPrompt: desc.trim() || undefined,
      });
      setResult(gen.photo.imageUrl);
      setPoints(gen.remainingPoints);
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  }

  if (!char) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header className="topbar">
        <button className="nav-btn nav-prev" onClick={() => router.push("/home")}>
          <Icon name="chevron-left" size={24} />
        </button>
        <span className="headline1">사진 찍기</span>
        <span className="point-badge">
          <span className="p">P</span> {points === null ? "…" : points.toLocaleString()}
        </span>
      </header>

      {/* 현재 캐릭터 */}
      <div
        style={{
          padding: "0 20px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="body2" style={{ color: "var(--gray-400)" }}>
          현재 캐릭터
        </span>
        <span className="label1" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar emoji="🙂" src={char.profileImageUrl ?? undefined} size={26} radius={13} />
          {char.name}
        </span>
      </div>

      {/* 결과/미리보기 */}
      <div style={{ padding: "4px 20px" }}>
        <div
          style={{
            borderRadius: 16,
            border: "1px solid var(--gray-100)",
            background: "var(--gray-50)",
            minHeight: 340,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            overflow: "hidden",
          }}
        >
          {result ? (
            <div style={{ position: "relative", width: "100%" }} className="fade-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result} alt="" style={{ width: "100%", display: "block" }} />
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  top: 10,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(30,30,30,0.6)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <Icon name="check" size={13} style={{ verticalAlign: "-2px", marginRight: 3 }} />갤러리에 저장됨
              </span>
            </div>
          ) : busy ? (
            <div style={{ width: "100%", position: "relative" }}>
              <div className="skeleton" style={{ width: "100%", aspectRatio: "3/4", borderRadius: 16 }} />
              <span
                className="body2"
                style={{
                  position: "absolute",
                  bottom: 16,
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  color: "var(--gray-600)",
                }}
              >
                <Icon name="camera" size={15} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                {char.name} 촬영 중... (30초 정도)
              </span>
            </div>
          ) : (
            <>
              <Avatar emoji="🙂" src={char.profileImageUrl ?? undefined} size={110} radius={14} />
              <span className="body2" style={{ color: "var(--gray-500)" }}>
                컨셉을 고르고 생성을 눌러주세요
              </span>
              {error && (
                <span className="caption" style={{ color: "#d64545", padding: "0 20px", textAlign: "center" }}>
                  {error.slice(0, 160)}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 컨셉 카탈로그 (백엔드 제공) */}
      <div style={{ padding: "14px 20px 0" }}>
        <div className="chip-row">
          {concepts.map((c) => (
            <button
              key={c.code}
              className={`chip ${concept?.code === c.code ? "selected" : ""}`}
              onClick={() => setConcept(c)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <span className="label1" style={{ whiteSpace: "nowrap" }}>
          설명 추가
        </span>
        <input
          className="input"
          placeholder="예: 크리스마스 분위기, 안경 쓴 모습"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </div>

      <div style={{ flex: 1 }} />

      {/* 포인트 정산 */}
      <div
        style={{
          borderTop: "1px dashed var(--gray-300)",
          padding: "16px 20px calc(20px + env(safe-area-inset-bottom))",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span className="body2" style={{ color: "var(--gray-500)" }}>
            남은 포인트
          </span>
          <span className="body2" style={{ color: "var(--orange-700)", fontWeight: 700 }}>
            {points === null ? "…" : points.toLocaleString()}
          </span>
        </div>
        <button className="cta" onClick={generate} disabled={busy || !concept}>
          {busy ? "생성 중..." : result ? "다시 생성" : "생성"}
        </button>
      </div>
    </div>
  );
}
