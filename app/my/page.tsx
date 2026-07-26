"use client";

// 마이페이지 — Spring 백엔드 연동판 (figma mypage).
// 계정(포인트·구독 등급) + 활성 캐릭터 프로필 + 갤러리(백엔드 photo).

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  backend,
  getActiveCharacterId,
  setActiveCharacterId,
  type CharacterSummary,
  type MyPage as MyPageData,
  type PhotoItem,
} from "@/lib/api";
import { Avatar, BottomNav } from "../components";
import { Icon } from "../icons";

export default function MyPage() {
  const router = useRouter();
  const [me, setMe] = useState<MyPageData | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [viewer, setViewer] = useState<PhotoItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await backend.getMe();
        if (data.characters.length === 0) {
          router.replace("/create");
          return;
        }
        setMe(data);
        const saved = getActiveCharacterId();
        const active =
          data.characters.find((c) => c.id === saved) ?? data.characters[0];
        setActiveCharacterId(active.id);
        setActiveId(active.id);
        setPhotos(await backend.getGallery(active.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "백엔드 연결 실패");
      }
    })();
  }, [router]);

  async function switchTo(id: number) {
    setActiveCharacterId(id);
    setActiveId(id);
    setPhotos([]);
    setPhotos(await backend.getGallery(id));
  }

  if (error) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100dvh", padding: 24 }}>
        <div className="body2" style={{ color: "var(--gray-500)", textAlign: "center" }}>{error}</div>
      </div>
    );
  }
  const char: CharacterSummary | undefined = me?.characters.find((c) => c.id === activeId);
  if (!me || !char) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header className="topbar">
        <span className="h3">마이페이지</span>
        <span className="point-badge">
          <span className="p">P</span> {me.points.toLocaleString()}
        </span>
      </header>

      {/* 계정 요약 (백엔드 /api/me) */}
      <div
        style={{
          margin: "0 20px 14px",
          padding: "12px 16px",
          borderRadius: 12,
          background: "var(--gray-50)",
          border: "1px solid var(--gray-100)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="body2" style={{ color: "var(--gray-600)" }}>
          {me.email}
        </span>
        <span className="chip selected" style={{ pointerEvents: "none" }}>
          {me.subscriptionTier}
        </span>
      </div>

      {/* 캐릭터 프로필 헤더 */}
      <div style={{ padding: "0 20px 16px", display: "flex", gap: 14, alignItems: "center" }}>
        <Avatar emoji="🙂" src={char.profileImageUrl ?? undefined} size={72} radius={16} />
        <div style={{ flex: 1 }}>
          <div className="headline1">{char.name}</div>
          <div className="body2" style={{ color: "var(--gray-500)" }}>
            {char.relationshipType} · {char.age} · {char.gender}
          </div>
        </div>
        <button
          className="chip"
          style={{ flexShrink: 0 }}
          onClick={() => router.push("/edit")}
        >
          <Icon name="edit" size={15} style={{ verticalAlign: "-2px", marginRight: 4 }} />편집
        </button>
      </div>

      {/* 캐릭터 전환 (여러 명일 때) */}
      {me.characters.length > 1 && (
        <div style={{ padding: "0 20px 12px", display: "flex", gap: 8, overflowX: "auto" }}>
          {me.characters.map((c) => (
            <button
              key={c.id}
              onClick={() => void switchTo(c.id)}
              className={`chip ${c.id === activeId ? "selected" : ""}`}
              style={{ whiteSpace: "nowrap" }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* 갤러리 (백엔드 /gallery) */}
      <div style={{ padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span className="label1">사진첩</span>
          <span className="caption" style={{ color: "var(--gray-400)" }}>
            {photos.length}장
          </span>
        </div>

        {photos.length === 0 ? (
          <div
            style={{
              padding: "48px 0",
              textAlign: "center",
              color: "var(--gray-400)",
              border: "1px dashed var(--gray-200)",
              borderRadius: 14,
            }}
          >
            <Icon name="camera" size={28} style={{ color: "var(--gray-400)", marginBottom: 8 }} />
            <div className="body2">아직 사진이 없어요</div>
            <button
              className="chip"
              style={{ marginTop: 12 }}
              onClick={() => router.push("/photobooth")}
            >
              포토부스에서 찍기
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              paddingBottom: 20,
            }}
          >
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => setViewer(p)}
                style={{ border: "none", padding: 0, background: "transparent", cursor: "pointer" }}
              >
                <div style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imageUrl}
                    alt={p.concept ?? ""}
                    style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: 12, display: "block" }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      left: 8,
                      bottom: 8,
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: "rgba(30,30,30,0.6)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {p.type === "PROFILE" ? "프로필" : p.concept ?? "포토부스"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav active="my" />

      {/* 사진 뷰어 */}
      {viewer && (
        <div className="dim" onClick={() => setViewer(null)}>
          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={viewer.imageUrl}
              alt=""
              style={{ maxWidth: "92vw", maxHeight: "74vh", borderRadius: 16 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
