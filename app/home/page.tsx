"use client";

// home — Spring 백엔드 연동판.
// 캐릭터 목록·인사말 모두 백엔드에서. (첫 대화면 GET messages가 인사를 만들어 돌려준다)

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  backend,
  getActiveCharacterId,
  setActiveCharacterId,
  type CharacterSummary,
} from "@/lib/api";
import { BottomNav } from "../components";
import { Icon } from "../icons";

export default function Home() {
  const router = useRouter();
  const [list, setList] = useState<CharacterSummary[]>([]);
  const [char, setChar] = useState<CharacterSummary | null>(null);
  const [greeting, setGreeting] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const loadGreeting = useCallback(async (c: CharacterSummary) => {
    setGreeting("");
    try {
      const msgs = await backend.getMessages(c.id);
      const lastAi = [...msgs].reverse().find((m) => m.sender === "AI");
      setGreeting(lastAi?.content ?? "오늘도 왔네! 기다렸어");
    } catch {
      setGreeting("오늘도 왔네! 기다렸어");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const characters = await backend.listCharacters();
        if (characters.length === 0) {
          router.replace("/create");
          return;
        }
        setList(characters);
        const activeId = getActiveCharacterId();
        const active =
          characters.find((c) => c.id === activeId) ?? characters[0];
        setActiveCharacterId(active.id);
        setChar(active);
        void loadGreeting(active);
      } catch (e) {
        setError(e instanceof Error ? e.message : "백엔드 연결 실패");
      }
    })();
  }, [router, loadGreeting]);

  function switchCharacter() {
    if (list.length < 2 || !char) return;
    const idx = list.findIndex((c) => c.id === char.id);
    const next = list[(idx + 1) % list.length];
    setActiveCharacterId(next.id);
    setChar(next);
    void loadGreeting(next);
  }

  if (error) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100dvh", padding: 24 }}>
        <div className="body2" style={{ color: "var(--gray-500)", textAlign: "center" }}>
          {error}
          <br />
          백엔드(localhost:8080)가 켜져 있는지 확인해주세요.
        </div>
      </div>
    );
  }
  if (!char) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background:
          "linear-gradient(180deg, var(--orange-50) 0%, #fffdf7 42%, var(--orange-100) 100%)",
      }}
    >
      <header className="topbar">
        <span className="logo" style={{ fontSize: 22, color: "var(--gray-800)" }}>
          everyday
        </span>
        <Icon name="bell" size={22} style={{ color: "var(--gray-700)" }} />
      </header>

      {/* 캐릭터 바 — ⇄로 전환 */}
      <div style={{ padding: "0 20px 12px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 12,
            background: "linear-gradient(90deg, var(--orange-100), var(--orange-300))",
            fontSize: 14,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>
            {char.name} · {char.relationshipType}
          </span>
          <Icon name="book" size={16} style={{ color: "var(--orange-700)" }} />
          <button
            onClick={switchCharacter}
            title={list.length > 1 ? "캐릭터 전환" : "캐릭터가 1명이에요"}
            style={{
              border: "none",
              background: "transparent",
              cursor: list.length > 1 ? "pointer" : "default",
              opacity: list.length > 1 ? 1 : 0.35,
              padding: 0,
              display: "flex",
            }}
          >
            <Icon name="change" size={17} />
          </button>
        </div>
      </div>

      {/* 캐릭터 이미지 — 남는 세로 공간을 flex로 채움 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          margin: "0 20px",
          borderRadius: 18,
          overflow: "hidden",
          background: "linear-gradient(160deg, var(--orange-100), var(--orange-400))",
        }}
      >
        {char.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={char.profileImageUrl}
            alt=""
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: "min(38vw, 140px)",
            }}
          >
            🙂
          </div>
        )}
        {/* 먼저 건네는 인사 말풍선 */}
        <div
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: 18,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {greeting ? (
            <div className="bubble char fade-in">{greeting}</div>
          ) : (
            <div className="bubble char" style={{ display: "flex" }}>
              <span className="typing">
                <span />
                <span />
                <span />
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 액션 3버튼 */}
      <div className="home-actions">
        <Link href="/chat" className="home-action">
          <span className="ico-badge"><Icon name="chat" size={20} /></span>대화하기
        </Link>
        <Link href="/episode" className="home-action">
          <span className="ico-badge"><Icon name="heart" size={20} /></span>에피소드
        </Link>
        <Link href="/photobooth" className="home-action">
          <span className="ico-badge"><Icon name="camera" size={20} /></span>포토부스
        </Link>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
