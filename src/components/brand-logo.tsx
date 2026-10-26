import { useId } from 'react'

type BrandLogoProps = {
  size?: number
  className?: string
}

export function BrandLogo({ size = 56, className }: BrandLogoProps) {
  const uid = useId().replace(/:/g, '')
  const bgId = `logo-bg-${uid}`
  const accentId = `logo-accent-${uid}`

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="eDecision"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a2670" />
          <stop offset="1" stopColor="#090f33" />
        </linearGradient>
        <linearGradient id={accentId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7aa2ff" />
          <stop offset="1" stopColor="#3b6cff" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill={`url(#${bgId})`} stroke="rgba(255,255,255,0.18)" />
      <text
        x="11"
        y="42"
        fill="#ffffff"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="27"
        fontWeight="800"
        letterSpacing="-1"
      >
        e
      </text>
      <text
        x="29"
        y="42"
        fill={`url(#${accentId})`}
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="27"
        fontWeight="800"
        letterSpacing="-1"
      >
        D
      </text>
      <circle cx="49" cy="20" r="3" fill="#7aa2ff" />
    </svg>
  )
}
