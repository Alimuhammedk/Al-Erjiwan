"use client";

import { useState } from "react";
import { ar } from "@/content/ar";

const t = ar.colours;
const ROOMS = ["living", "bedroom", "kitchen", "exterior"] as const;
type Room = (typeof ROOMS)[number];

// Four simple illustrated rooms. Only the main wall takes the chosen colour; everything else stays neutral.
function Scene({ room, wall }: { room: Room; wall: string }) {
  const shade = "rgba(0,0,0,0.08)";
  switch (room) {
    case "living":
      return (
        <>
          <rect width="600" height="400" fill={wall} />
          <rect y="300" width="600" height="100" fill="#c9b79c" />
          <rect y="296" width="600" height="8" fill={shade} />
          <rect x="60" y="70" width="140" height="130" rx="6" fill="#dff1fb" stroke="#f5f5f5" strokeWidth="10" />
          <rect x="260" y="90" width="120" height="80" rx="4" fill="#f5f2ec" stroke="#8a6d4b" strokeWidth="6" />
          <rect x="300" y="215" width="270" height="85" rx="14" fill="#7d8aa3" />
          <rect x="290" y="250" width="40" height="70" rx="10" fill="#6b7790" />
          <rect x="550" y="250" width="40" height="70" rx="10" fill="#6b7790" />
          <rect x="330" y="205" width="90" height="50" rx="12" fill="#98a3ba" />
          <rect x="60" y="330" width="200" height="14" rx="7" fill="#8a6d4b" />
          <rect x="90" y="344" width="8" height="30" fill="#8a6d4b" />
          <rect x="222" y="344" width="8" height="30" fill="#8a6d4b" />
        </>
      );
    case "bedroom":
      return (
        <>
          <rect width="600" height="400" fill={wall} />
          <rect y="310" width="600" height="90" fill="#bfae95" />
          <rect x="380" y="60" width="150" height="120" rx="6" fill="#dff1fb" stroke="#f5f5f5" strokeWidth="10" />
          <rect x="60" y="170" width="300" height="40" rx="8" fill="#8a6d4b" />
          <rect x="60" y="200" width="300" height="110" rx="10" fill="#f4efe6" />
          <rect x="60" y="200" width="300" height="38" rx="10" fill="#c9a7c7" />
          <rect x="80" y="180" width="90" height="38" rx="14" fill="#fff" />
          <rect x="190" y="180" width="90" height="38" rx="14" fill="#fff" />
          <rect x="400" y="250" width="110" height="60" rx="6" fill="#a98763" />
          <rect x="430" y="215" width="50" height="35" rx="8" fill="#f1d9a8" />
        </>
      );
    case "kitchen":
      return (
        <>
          <rect width="600" height="400" fill={wall} />
          <rect y="320" width="600" height="80" fill="#cfcac2" />
          <rect x="40" y="60" width="240" height="90" rx="6" fill="#f2f2f2" stroke="#d6d6d6" strokeWidth="4" />
          <line x1="160" y1="60" x2="160" y2="150" stroke="#d6d6d6" strokeWidth="4" />
          <rect x="40" y="220" width="520" height="100" rx="4" fill="#f2f2f2" stroke="#d6d6d6" strokeWidth="4" />
          <rect x="40" y="206" width="520" height="16" fill="#6e6a64" />
          <line x1="213" y1="222" x2="213" y2="320" stroke="#d6d6d6" strokeWidth="4" />
          <line x1="386" y1="222" x2="386" y2="320" stroke="#d6d6d6" strokeWidth="4" />
          <rect x="360" y="70" width="170" height="110" rx="6" fill="#dff1fb" stroke="#f5f5f5" strokeWidth="10" />
          <circle cx="110" cy="190" r="16" fill="#e7c36a" />
        </>
      );
    case "exterior":
      return (
        <>
          <rect width="600" height="400" fill="#cfe8f7" />
          <circle cx="520" cy="70" r="36" fill="#fde9a2" />
          <rect y="330" width="600" height="70" fill="#8cbf7a" />
          <rect x="110" y="140" width="380" height="200" fill={wall} />
          <polygon points="90,145 300,50 510,145" fill="#8a4b3c" />
          <rect x="270" y="220" width="70" height="120" rx="4" fill="#6b4a32" />
          <rect x="140" y="190" width="90" height="70" rx="4" fill="#dff1fb" stroke="#f5f5f5" strokeWidth="8" />
          <rect x="380" y="190" width="90" height="70" rx="4" fill="#dff1fb" stroke="#f5f5f5" strokeWidth="8" />
          <rect x="110" y="330" width="380" height="10" fill={shade} />
        </>
      );
  }
}

export function RoomPreview({ hex }: { hex: string }) {
  const [room, setRoom] = useState<Room>("living");
  const names = t.rooms as Record<Room, string>;
  return (
    <div className="space-y-3" data-testid="room-preview">
      <div role="tablist" aria-label={t.preview} className="flex flex-wrap gap-2">
        {ROOMS.map((r) => (
          <button
            key={r}
            role="tab"
            type="button"
            aria-selected={room === r}
            onClick={() => setRoom(r)}
            className={`min-h-11 rounded-full px-4 text-sm font-bold ${room === r ? "bg-brand-700 text-white" : "border-2 border-brand-100 text-brand-700 hover:bg-brand-50"}`}
          >
            {names[r]}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 600 400" role="img" aria-label={`${names[room]}`} className="w-full overflow-hidden rounded-2xl border border-brand-100" data-testid="room-svg" data-room={room} data-wall={hex}>
        <Scene room={room} wall={hex} />
      </svg>
    </div>
  );
}
