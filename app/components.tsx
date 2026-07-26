"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/** 온보딩 상단바: 이전 / 다음 */
export function WizardBar({
  onPrev,
  onNext,
  nextDisabled,
  showPrev = true,
}: {
  onPrev?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  showPrev?: boolean;
}) {
  return (
    <div className="topbar">
      {showPrev ? (
        <button className="nav-btn nav-prev" onClick={onPrev}>
          <Icon name="chevron-left" size={18} /> 이전
        </button>
      ) : (
        <span />
      )}
      {onNext ? (
        <button
          className="nav-btn nav-next"
          onClick={onNext}
          disabled={nextDisabled}
        >
          다음 <Icon name="chevron-right" size={18} />
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

/** 진행 표시 (4단계) */
export function Progress({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <div className="progress">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i === step ? "active" : ""} />
      ))}
    </div>
  );
}

/** 칩 */
export function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`chip ${selected ? "selected" : ""}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

/** 캐릭터 아바타 — imageUrl 있으면 사진, 없으면 이모지 placeholder */
export function Avatar({
  emoji,
  src,
  size = 120,
  radius = 16,
}: {
  emoji: string;
  src?: string | null;
  size?: number | string;
  radius?: number;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="avatar"
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          objectFit: "cover",
          display: "block",
        }}
      />
    );
  }
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize:
          typeof size === "number" ? Math.max(28, size * 0.4) : "min(38vw, 140px)",
      }}
    >
      {emoji}
    </div>
  );
}

/** 바텀 내비게이션 (커뮤니티는 Phase 2 → 갤러리로 대체) */
export function BottomNav({
  active,
}: {
  active: "home" | "chat" | "gallery" | "community" | "my";
}) {
  const item = (
    href: string,
    icon: IconName,
    label: string,
    isActive: boolean,
  ) => (
    <Link href={href} className={isActive ? "active" : ""}>
      <Icon name={icon} size={24} />
      {label}
    </Link>
  );
  return (
    <nav className="bottom-nav">
      {item("/home", "home", "홈", active === "home")}
      {item("/chatlist", "chat", "채팅", active === "chat")}
      {item("/community", "community", "커뮤", active === "community" || active === "gallery")}
      {item("/my", "person", "마이", active === "my")}
    </nav>
  );
}

/** 화면 본문 패딩 래퍼 */
export function Body({ children }: { children: ReactNode }) {
  return <div style={{ padding: "0 20px", flex: 1 }}>{children}</div>;
}
