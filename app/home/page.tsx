"use client";

// home — Spring 백엔드 연동판. figma 수정본(42:2555): 캐릭터 풀블리드 카드 +
// 카드 하단 오버레이에 이름·→ 버튼·상태 2줄, 그 아래 3버튼.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [char, setChar] = useState<CharacterSummary | null>(null);
  const [dayCount, setDayCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const characters = await backend.listCharacters();
        if (characters.length === 0) {
          router.replace("/create");
          return;
        }
        const activeId = getActiveCharacterId();
        const active =
          characters.find((c) => c.id === activeId) ?? characters[0];
        setActiveCharacterId(active.id);
        setChar(active);

        // 대화 일수 — 메시지 createdAt 최소값 기준. (첫 대화면 GET이 인사를 만들어 준다)
        try {
          const msgs = await backend.getMessages(active.id);
          const times = msgs
            .map((m) => new Date(m.createdAt).getTime())
            .filter((t) => Number.isFinite(t));
          if (times.length) {
            const first = Math.min(...times);
            const days =
              Math.floor((Date.now() - first) / 86_400_000) + 1;
            setDayCount(Math.max(1, days));
          }
        } catch {
          /* 일수 계산 실패 시 1일째 대화 유지 */
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "백엔드 연결 실패");
      }
    })();
  }, [router]);

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

  const divider = (
    <span style={{ opacity: 0.45, margin: "0 8px", fontWeight: 400 }}>|</span>
  );

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

      {/* 캐릭터 풀블리드 카드 — 남는 세로 공간을 flex로 채움 */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          margin: "4px 20px 0",
          borderRadius: 20,
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

        {/* 하단 오버레이 — 이름 + → + 상태 2줄 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "56px 20px 20px",
            background:
              "linear-gradient(transparent, rgba(20,18,16,0.35) 40%, rgba(20,18,16,0.82))",
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span className="h1" style={{ color: "#fff" }}>
              {char.name}
            </span>
            <Link
              href="/character"
              aria-label={`${char.name} 캐릭터 페이지`}
              style={{
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: "50%",
                background: "#fff",
                color: "var(--gray-900)",
                display: "grid",
                placeItems: "center",
                textDecoration: "none",
              }}
            >
              <Icon name="arrow-right" size={22} />
            </Link>
          </div>

          <div style={{ fontSize: 13, fontWeight: 500, lineHeight: "22px" }}>
            <div>
              <span style={{ fontWeight: 700 }}>{char.relationshipType}</span>
              {divider}
              <span style={{ opacity: 0.9 }}>{dayCount}일째 대화</span>
            </div>
            <div>
              <span style={{ fontWeight: 700 }}>에피소드</span>
              {divider}
              <span style={{ opacity: 0.9 }}>진행 전</span>
            </div>
          </div>
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
