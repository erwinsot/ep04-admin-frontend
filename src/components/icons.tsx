type IconProps = { size?: number }

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  viewBox: '0 0 24 24',
}

export function RefreshIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
    </svg>
  )
}

export function SearchIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2} stroke="#52645C">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  )
}

export function CopyIcon({ size = 14 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </svg>
  )
}

export function CheckIcon({ size = 12 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={3.5}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

export function CloseIcon({ size = 12 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={3.5}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function DotsIcon({ size = 12 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={3.5}>
      <path d="M6 12h.01M12 12h.01M18 12h.01" />
    </svg>
  )
}

export function AlertIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={3}>
      <path d="M12 6v8M12 18v.5" />
    </svg>
  )
}
