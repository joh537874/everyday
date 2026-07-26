"use client";

// FS-04 에피소드 — Spring 백엔드 연동판.
// 카탈로그(GET /api/episodes) → start(진행 등록 + starters 수신) → 에피소드 전용 채팅으로 이동.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  backend,
  getActiveCharacterId,
  setActiveCharacterId,
  type CharacterSummary,
  type EpisodeItem,
  type EpisodeStart,
} from "@/lib/api";
import { Avatar } from "../components";
import { Icon } from "../icons";

export default function EpisodePage() {
  const router = useRouter();
  const [char, setChar] = useState<CharacterSummary | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [selected, setSelected] = useState<{ episode: EpisodeItem; start: EpisodeStart } | null>(null);
  const [starting, setStarting] = useState<number | null>(null);
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
        setEpisodes(await backend.listEpisodes());
      } catch (e) {
        setError(e instanceof Error ? e.message : "백엔드 연결 실패");
      }
    })();
  }, [router]);

  async function select(ep: EpisodeItem) {
    if (!char || starting) return;
    setStarting(ep.id);
    try {
      const start = await backend.startEpisode(char.id, ep.id);
      setSelected({ episode: ep, start });
    } catch (e) {
      setError(e instanceof Error ? e.message : "에피소드 시작 실패");
    } finally {
      setStarting(null);
    }
  }

  if (error) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100dvh", padding: 24 }}>
        <div className="body2" style={{ color: "var(--gray-500)", textAlign: "center" }}>{error}</div>
      </div>
    );
  }
  if (!char) return null;

  // ── 시나리오 진행 화면 ──
  if (selected) {
    const { episode, start } = selected;
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
        <header className="topbar">
          <span
            className="headline1"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <Avatar emoji="🙂" src={char.profileImageUrl ?? undefined} size={32} radius={16} />
            {episode.title}
          </span>
          <button className="nav-btn nav-prev" onClick={() => setSelected(null)}>
            <Icon name="menu" size={22} />
          </button>
        </header>

        {/* 장면 이미지 영역 + 지문 */}
        <div style={{ position: "relative" }}>
          <div
            className="avatar"
            style={{
              width: "100%",
              height: 420,
              borderRadius: 0,
              fontSize: 110,
              background:
                "linear-gradient(180deg, var(--orange-100), var(--orange-500))",
            }}
          >
            {episode.emoji}
          </div>
          <div
            className="body1 fade-in"
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 20,
              padding: "16px 18px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.94)",
              border: "1px solid var(--gray-100)",
            }}
          >
            {episode.description}
          </div>
        </div>

        {/* 선택지 */}
        <div style={{ padding: 20 }}>
          <div className="headline1" style={{ marginBottom: 14 }}>
            먼저 말을 걸어주세요
          </div>
          {start.starters.map((s) => (
            <button
              key={s}
              className="select-card"
              onClick={() =>
                router.push(
                  `/chat?episode=${episode.id}&title=${encodeURIComponent(
                    `${episode.emoji} ${episode.title}`,
                  )}&starter=${encodeURIComponent(s)}`,
                )
              }
            >
              {s}
              <span className="check">→</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── 시나리오 목록 ──
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header className="topbar">
        <button className="nav-btn nav-prev" onClick={() => router.push("/home")}>
          <Icon name="chevron-left" size={24} />
        </button>
        <span className="headline1">에피소드</span>
        <span style={{ width: 24 }} />
      </header>
      <div style={{ padding: "8px 20px" }}>
        <div className="body2" style={{ color: "var(--gray-500)", marginBottom: 16 }}>
          {char.name}(와)과 함께할 이벤트를 골라보세요
        </div>
        {episodes.map((ep) => (
          <button key={ep.id} className="select-card" onClick={() => void select(ep)}>
            <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 22 }}>{ep.emoji}</span>
              <span>
                <div style={{ fontWeight: 700, textAlign: "left" }}>{ep.title}</div>
                <div
                  className="caption"
                  style={{ color: "var(--gray-500)", textAlign: "left" }}
                >
                  {ep.description.slice(0, 24)}…
                </div>
              </span>
            </span>
            {starting === ep.id ? (
              <span className="caption" style={{ color: "var(--orange-700)" }}>…</span>
            ) : (
              <Icon name="chevron-right" size={18} style={{ color: "var(--gray-300)" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
