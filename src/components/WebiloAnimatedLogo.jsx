import React, { useId } from "react";
import "./styles/WebiloAnimatedLogo.css";

export default function WebiloAnimatedLogo({
  size = 40,
  showWordmark = false,
  wordmarkSize = 24,
  animated = true,
  inverse = false,
  className = "",
}) {
  const id = useId();
  const bgGradientId = `webiloBg-${id}`;
  const ambientGradientId = `webiloAmbient-${id}`;
  const edgeGradientId = `webiloEdge-${id}`;
  const glowId = `webiloGlow-${id}`;
  const shadowId = `webiloShadow-${id}`;
  const clipId = `webiloClip-${id}`;

  return (
    <span
      className={`webilo-animated-logo ${animated ? "is-animated" : ""} ${inverse ? "is-inverse" : ""} ${className}`}
      style={{ "--webilo-logo-size": `${size}px`, "--webilo-wordmark-size": `${wordmarkSize}px` }}
    >
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none" role="img" aria-label="Webilo">
        <defs>
          <linearGradient id={bgGradientId} x1="14" y1="8" x2="108" y2="112" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6DB5A5" />
            <stop offset="0.42" stopColor="#237C6B" />
            <stop offset="0.76" stopColor="#155A4E" />
            <stop offset="1" stopColor="#17312C" />
          </linearGradient>
          <radialGradient id={ambientGradientId} cx="0" cy="0" r="1" gradientTransform="translate(34 26) rotate(48) scale(88)">
            <stop stopColor="#FFFFFF" stopOpacity=".34" />
            <stop offset=".48" stopColor="#FFFFFF" stopOpacity=".05" />
            <stop offset="1" stopColor="#10231F" stopOpacity=".24" />
          </radialGradient>
          <linearGradient id={edgeGradientId} x1="20" y1="16" x2="102" y2="104" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" stopOpacity=".72" />
            <stop offset=".48" stopColor="#B9E0D6" stopOpacity=".18" />
            <stop offset="1" stopColor="#5EF2D6" stopOpacity=".5" />
          </linearGradient>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={shadowId} x="-30%" y="-30%" width="160%" height="170%">
            <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#17312C" floodOpacity=".28" />
          </filter>
          <clipPath id={clipId}><rect x="9" y="9" width="102" height="102" rx="32" /></clipPath>
        </defs>

        <rect className="webilo-logo__glow" x="8" y="8" width="104" height="104" rx="33" fill="#5EF2D6" filter={`url(#${glowId})`} />
        <rect className="webilo-logo__shadow" x="9" y="9" width="102" height="102" rx="32" fill="#173D35" filter={`url(#${shadowId})`} />
        <g clipPath={`url(#${clipId})`}>
          <rect className="webilo-logo__tile" x="9" y="9" width="102" height="102" rx="32" fill={`url(#${bgGradientId})`} />
          <rect x="9" y="9" width="102" height="102" rx="32" fill={`url(#${ambientGradientId})`} />
          <path className="webilo-logo__mesh" d="M8 40C32 27 53 31 70 22C88 13 102 8 118 14M3 88C29 73 46 82 66 70C83 60 98 59 118 66" stroke="white" strokeOpacity=".1" strokeWidth="1.5" />
          <path className="webilo-logo__shine" d="M-8 32L32 -8L102 62L62 102Z" fill="white" fillOpacity=".09" />
          <circle className="webilo-logo__orbit" cx="60" cy="57" r="40" stroke={`url(#${edgeGradientId})`} strokeWidth="1.5" strokeDasharray="8 7" fill="none" opacity=".55" />
        </g>
        <rect className="webilo-logo__edge" x="10" y="10" width="100" height="100" rx="31" stroke={`url(#${edgeGradientId})`} strokeWidth="1.5" />
        <path className="webilo-logo__network" d="M31 43C43 31 51 31 60 51C69 31 78 31 89 43" stroke="#5EF2D6" strokeOpacity=".42" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" />
        <path className="webilo-logo__mark" d="M31 42L44 80L60 51L76 80L89 42" stroke="white" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />

        {[
          ["left", 31, 42],
          ["mid", 60, 51],
          ["right", 89, 42],
        ].map(([name, cx, cy]) => (
          <React.Fragment key={name}>
            <circle className={`webilo-logo__pulse webilo-logo__pulse--${name}`} cx={cx} cy={cy} r="4.5" stroke="#5EF2D6" strokeWidth="2.5" fill="none" />
            <circle className={`webilo-logo__node webilo-logo__node--${name}`} cx={cx} cy={cy} r="4.5" fill="#5EF2D6" stroke="white" strokeOpacity=".7" />
          </React.Fragment>
        ))}

        <path className="webilo-logo__arrow" d="M70 91C78 88 85 81 91 70M82 70H91V79" stroke="#5EF2D6" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        <path className="webilo-logo__spark" d="M98 55V63M94 59H102" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {showWordmark && <strong className="webilo-animated-logo__wordmark">webilo</strong>}
    </span>
  );
}
