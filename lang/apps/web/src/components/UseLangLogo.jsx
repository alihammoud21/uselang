export function UseLangLogo({ size = 'md', showText = true, className = '' }) {
  const sizes = {
    sm: { w: 28, h: 28, text: '0.82rem', orbSize: 18 },
    md: { w: 42, h: 42, text: '1rem', orbSize: 26 },
    lg: { w: 200, h: 120, text: '2.2rem', orbSize: 80 },
  }
  const s = sizes[size] || sizes.md

  if (size === 'lg') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div
          className="relative flex items-center overflow-hidden"
          style={{
            width: s.w,
            height: s.h,
            borderRadius: 20,
            background: 'linear-gradient(145deg, #f0dcc0 0%, #e8ccaa 50%, #dfc0a0 100%)',
            boxShadow: '0 12px 40px -12px rgba(160, 120, 60, 0.25), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <span
            className="absolute left-3 font-display font-bold"
            style={{
              fontSize: s.text,
              color: 'rgba(255,255,255,0.55)',
              textShadow: '0 1px 2px rgba(180,140,80,0.15)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            Lang
          </span>
          <div
            className="absolute"
            style={{
              right: -4,
              top: '50%',
              transform: 'translateY(-50%)',
              width: s.orbSize,
              height: s.orbSize,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 28%, #ffffff 0%, #e3f0ff 28%, #a8cdff 60%, #5a9fff 100%)',
              border: '2px solid rgba(0, 122, 255, 0.55)',
              boxShadow: '0 8px 24px -6px rgba(0, 122, 255, 0.22)',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          width: s.w,
          height: s.h,
          borderRadius: s.w * 0.28,
          background: 'linear-gradient(145deg, #f0dcc0 0%, #e8ccaa 50%, #dfc0a0 100%)',
          boxShadow: '0 4px 12px -4px rgba(160, 120, 60, 0.2)',
        }}
      >
        <div
          style={{
            width: s.orbSize,
            height: s.orbSize,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 28%, #ffffff 0%, #e3f0ff 28%, #a8cdff 60%, #5a9fff 100%)',
            border: '1.5px solid rgba(0, 122, 255, 0.45)',
            boxShadow: '0 3px 8px -2px rgba(0, 122, 255, 0.18)',
          }}
        />
      </div>
      {showText ? (
        <span
          className="font-display font-bold tracking-[-0.02em]"
          style={{ fontSize: s.text }}
        >
          UseLang
        </span>
      ) : null}
    </div>
  )
}
