"use client";

import Image from "next/image";

type TopbarProps = {
  showLogout?: boolean;
  onLogout?: () => void;
};

export function Topbar({ showLogout = false, onLogout }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="logo-text">
        <Image alt="Logo" height={50} src="/images/logo.png" width={170} />
        <h1>
          <span style={{ color: "rgb(0, 102, 204)" }}>AT</span>
          <span style={{ color: "rgb(255,165,0)" }}>OM</span>
          <span> </span>
          <span>(</span>
          <span style={{ color: "rgb(0, 102, 204)" }}>AT</span>
          <span>lantic </span>
          <span style={{ color: "rgb(255, 165, 0)" }}>OM</span>
          <span>ics)</span>
        </h1>
      </div>
      {showLogout ? (
        <div className="logout">
          <button onClick={onLogout} type="button">
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
