"use client";

// chatlist — Spring 백엔드 연동판. 전체 캐릭터 그리드, 탭하면 활성 전환 + 채팅 진입.
// 백엔드에 삭제 API가 없어 편집(삭제) 모드는 비활성화했다.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { backend, setActiveCharacterId, type CharacterSummary } from "@/lib/api";
import { Avatar, BottomNav } from "../components";
import { Icon } from "../icons";

export default function ChatListPage() {
  const router = useRouter();
  const [list, setList] = useState<CharacterSummary[] | null>(null);
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
        <span style={{ width: 24 }} />
      </header>

      <div
        style={{
          padding: "4px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
      >
        {list.map((c) => (
          <button
            key={c.id}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
            }}
            onClick={() => {
              setActiveCharacterId(c.id);
              router.push("/chat");
            }}
          >
            <div
              style={{
                position: "relative",
                aspectRatio: "1 / 1.05",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <Avatar emoji="🙂" src={c.profileImageUrl ?? undefined} size="100%" radius={0} />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: "24px 10px 8px",
                  borderRadius: "0 0 14px 14px",
                  background: "linear-gradient(transparent, rgba(30,30,30,0.65))",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  color: "#fff",
                }}
              >
                <span className="label1">{c.name}</span>
                <span className="caption">
                  {c.age} | {c.gender}
                </span>
              </div>
            </div>
          </button>
        ))}

        {/* 새 캐릭터 만들기 */}
        <button
          onClick={() => router.push("/create")}
          style={{
            aspectRatio: "1 / 1.05",
            borderRadius: 14,
            border: "1px dashed var(--gray-300)",
            background: "var(--gray-50)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "var(--gray-500)",
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "all 200ms var(--ease)",
          }}
        >
          <Icon name="plus" size={26} style={{ color: "var(--orange-700)" }} />
          <span className="caption">새 캐릭터 만들기</span>
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav active="chat" />
    </div>
  );
}
