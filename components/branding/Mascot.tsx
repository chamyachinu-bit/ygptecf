interface MascotProps {
  className?: string
  size?: number
}

export function Mascot({ className = '', size = 120 }: MascotProps) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.17)}
      viewBox="0 0 120 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Pot body */}
      <path d="M38 112 L82 112 L76 132 L44 132 Z" fill="#92654a" />
      <rect x="32" y="106" width="56" height="8" rx="4" fill="#a87554" />

      {/* Soil */}
      <ellipse cx="60" cy="107" rx="22" ry="5" fill="#5c3d1e" opacity="0.4" />

      {/* Main stem */}
      <path d="M60 106 L60 72" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />

      {/* Left leaf */}
      <path
        d="M60 90 C48 78 33 82 36 94 C39 105 57 99 60 90Z"
        fill="#15803d"
      />
      <path d="M60 90 L46 84" stroke="#14532d" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

      {/* Right leaf */}
      <path
        d="M60 82 C72 70 87 75 84 87 C81 97 63 93 60 82Z"
        fill="#22c55e"
      />
      <path d="M60 82 L74 77" stroke="#166534" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

      {/* Head circle */}
      <circle cx="60" cy="52" r="23" fill="#dcfce7" />
      <circle cx="60" cy="52" r="23" stroke="#16a34a" strokeWidth="2" />

      {/* Eyes */}
      <ellipse cx="53" cy="49" rx="3.5" ry="4" fill="#166534" />
      <ellipse cx="67" cy="49" rx="3.5" ry="4" fill="#166534" />
      {/* Eye shine */}
      <circle cx="54.5" cy="47.5" r="1.2" fill="white" />
      <circle cx="68.5" cy="47.5" r="1.2" fill="white" />

      {/* Smile */}
      <path
        d="M52 60 Q60 67 68 60"
        stroke="#166534"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheeks */}
      <ellipse cx="48" cy="58" rx="4" ry="2.5" fill="#86efac" opacity="0.5" />
      <ellipse cx="72" cy="58" rx="4" ry="2.5" fill="#86efac" opacity="0.5" />

      {/* Small leaf sprout on top of head */}
      <path
        d="M60 29 C56 16 72 14 73 28 C74 38 62 36 60 29Z"
        fill="#16a34a"
      />
      <path d="M60 29 L61 17" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" />

      {/* Small sparkle dots */}
      <circle cx="90" cy="35" r="2" fill="#86efac" opacity="0.7" />
      <circle cx="96" cy="45" r="1.5" fill="#22c55e" opacity="0.5" />
      <circle cx="88" cy="50" r="1" fill="#4ade80" opacity="0.6" />
      <circle cx="28" cy="40" r="2" fill="#86efac" opacity="0.6" />
      <circle cx="22" cy="52" r="1.5" fill="#22c55e" opacity="0.4" />
    </svg>
  )
}

export function MascotMini({ className = '' }: { className?: string }) {
  return <Mascot size={64} className={className} />
}
