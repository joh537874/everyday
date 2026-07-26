"use client";

// chatlist — Spring 백엔드 연동판. figma 수정본(42:3162): 카톡식 세로 리스트.
// 좌 아바타 + 이름 + 마지막 메시지 프리뷰(1줄 말줄임). 탭하면 활성 전환 + 채팅 진입.
// 마지막 메시지 전용 API가 없어 캐릭터별 getMessages 병렬 호출로 뽑는다(실패 시 프리뷰 생략).

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { backend, setActiveCharacterId, type CharacterSummary } from "@/lib/api";
import { Avatar, BottomNav } from "../components";
import { Icon } from "../icons";

export default function ChatListPage() {
  const router = useRouter();
  const [list, setList] = useState<CharacterSummary[] | null>(null);
  const [previews, setPreviews] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const characters = await backend.listCharacters();
        if (characters.length === 0) {
          router.replace("/create");
          return;
        }
        setList(characters);

        // 각 캐릭터의 마지막 메시지를 병렬로 — 실패한 건 그냥 프리뷰 생략
        const entries = await Promise.all(
          characters.map(async (c) => {
            try {
              const msgs = await backend.getMessages(c.id);
              const last = msgs[msgs.length - 1];
              return [c.id, last?.content ?? ""] as const;
            } catch {
              return [c.id, ""] as const;
            }
          }),
        );
        setPreviews(Object.fromEntries(entries));
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
        </div>
      </div>
    );
  }
  if (!list) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header className="topbar">
        <span className="h3">채팅</span>
        <button
          onClick={() => router.push("/create")}
          aria-label="새 캐릭터 만들기"
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            display: "flex",
            color: "var(--gray-800)",
          }}
        >
          <Icon name="menu" size={24} />
        </button>
      </header>

      <div style={{ padding: "4px 0" }}>
        {list.map((c) => {
          const preview = previews[c.id];
          return (
            <button
              key={c.id}
              onClick={() => {
                setActiveCharacterId(c.id);
                router.push("/chat");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "12px 20px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <Avatar emoji="🙂" src={c.profileImageUrl ?? undefined} size={52} radius={16} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="label1" style={{ marginBottom: 2 }}>
                  {c.name}
                </div>
                <div
                  className="body2"
                  style={{
                    color: "var(--gray-500)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minHeight: 21,
                  }}
                >
                  {preview ?? ""}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav active="chat" />
    </div>
  );
}
