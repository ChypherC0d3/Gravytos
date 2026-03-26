const pulseAnimation = `
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.95); }
}
`;

export function LoadingScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <style>{pulseAnimation}</style>
      <div style={{ textAlign: 'center' }}>
        {/* Animated logo spinner */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent, #7c3aed, #a78bfa, transparent)',
            animation: 'pulse 2s ease-in-out infinite',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#0a0a0f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#a78bfa',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              G
            </span>
          </div>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 300,
            color: '#e2e8f0',
            letterSpacing: '0.05em',
            marginBottom: 8,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Gravytos
        </div>

        {/* Loading text */}
        <div
          style={{
            fontSize: 13,
            color: '#64748b',
            fontFamily: 'system-ui, sans-serif',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        >
          Loading...
        </div>
      </div>
    </div>
  );
}
