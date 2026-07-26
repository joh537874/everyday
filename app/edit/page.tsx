"use client";

// 캐릭터 편집 — Spring 백엔드 연동판 (figma 캐릭터 페이지 · 설정 탭).
// 백엔드 PATCH가 지원하는 필드(외모/성격/말투) + 호칭(call-name)만 수정한다.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { backend, getActiveCharacterId, type CharacterDetail } from "@/lib/api";
import { Avatar } from "../components";
import { Icon } from "../icons";

// ⚠️ 반드시 컴포넌트 밖에 정의. 안에 두면 렌더마다 새 컴포넌트가 되어
// 입력 한 글자마다 textarea가 리마운트→포커스 유실(=입력 안 됨)된다.
function Field({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="label1" style={{ marginBottom: 8, color: "var(--gray-700)" }}>
        {label}
      </div>
      <textarea
        className="input"
        style={{ height: rows * 26 + 20, resize: "none", lineHeight: 1.55 }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function EditCharacterPage() {
  const router = useRouter();
  const [char, setChar] = useState<CharacterDetail | null>(null);
  const [appearance, setAppearance] = useState("");
  const [personality, setPersonality] = useState("");
  const [speechStyles, setSpeechStyles] = useState("");
  const [callName, setCallName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const id = getActiveCharacterId();
      if (!id) {
        router.replace("/chatlist");
        return;
      }
      try {
        const detail = await backend.getCharacter(id);
        setChar(detail);
        setAppearance(detail.appearance ?? "");
        setPersonality(detail.personality ?? "");
        setSpeechStyles(detail.speechStyles.join("\n"));
        setCallName(detail.callName ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "백엔드 연결 실패");
      }
    })();
  }, [router]);

  async function save() {
    if (!char || saving) return;
    setSaving(true);
    setError(null);
    try {
      await backend.updateCharacter(char.id, {
        appearance,
        personality,
        speechStyles: speechStyles.split("\n").map((s) => s.trim()).filter(Boolean),
      });
      if (callName.trim() && callName.trim() !== (char.callName ?? "")) {
        await backend.setCallName(char.id, callName.trim());
      }
      router.push("/my");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (error && !char) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100dvh", padding: 24 }}>
        <div className="body2" style={{ color: "var(--gray-500)", textAlign: "center" }}>{error}</div>
      </div>
    );
  }
  if (!char) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header className="topbar" style={{ borderBottom: "1px solid var(--gray-100)" }}>
        <button className="nav-btn nav-prev" onClick={() => router.push("/my")}>
          <Icon name="chevron-left" size={18} /> 취소
        </button>
        <span className="headline1">캐릭터 페이지</span>
        <button className="nav-btn nav-next" onClick={() => void save()}>
          {saving ? "저장 중…" : "저장"}
        </button>
      </header>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        {/* 사진 + 이름 (이름 변경은 백엔드 미지원이라 표시만) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
          <Avatar emoji="🙂" src={char.profileImageUrl ?? undefined} size={100} radius={18} />
          <div className="headline1" style={{ marginTop: 12 }}>{char.name}</div>
          <div className="caption" style={{ color: "var(--gray-400)", marginTop: 4 }}>
            {char.relationshipType} · {char.age} · {char.gender}
          </div>
        </div>

        {/* 한 줄 소개 (figma 설정 탭 상단 요약 — 읽기 전용) */}
        {char.summary && (
          <div
            className="body2"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "var(--orange-50)",
              border: "1px solid var(--orange-200)",
              color: "var(--gray-700)",
              marginBottom: 22,
            }}
          >
            {char.summary}
          </div>
        )}

        {/* 호칭 */}
        <div
          style={{
            padding: "16px 18px",
            borderRadius: 14,
            background: "var(--orange-50)",
            border: "1px solid var(--orange-200)",
            marginBottom: 22,
          }}
        >
          <div className="label1" style={{ marginBottom: 8, color: "var(--orange-700)" }}>
            {char.name}(이)가 나를 부르는 호칭
          </div>
          <input
            className="input"
            style={{ background: "#fff" }}
            placeholder="예: 자기야, 은우야, 야"
            value={callName}
            onChange={(e) => setCallName(e.target.value)}
          />
        </div>

        <Field label="외모" value={appearance} onChange={setAppearance} rows={3} />
        <Field label="성격" value={personality} onChange={setPersonality} rows={3} />
        <Field
          label="말투 (한 줄에 하나)"
          value={speechStyles}
          onChange={setSpeechStyles}
          rows={3}
          placeholder="예: ~던데? 를 자주 씀"
        />

        {error && (
          <div className="caption" style={{ color: "#d64545", textAlign: "center" }}>{error}</div>
        )}
      </div>

      <div style={{ padding: 20 }}>
        <button className="cta" disabled={saving} onClick={() => void save()}>
          저장하기
        </button>
      </div>
    </div>
  );
}
