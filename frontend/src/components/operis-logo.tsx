// Hexagonal ring (hollow) com efeito 3D — fiel ao logo OPERIS
// 6 faces trapezoidais com gradientes ciano→azul-escuro (luz vindo do canto superior esquerdo)

export function OperisLogoMark({ size = 48 }: { size?: number }) {
  // Outer hexagon (pointy-top, R=43, center 50,50)
  const O = [
    [50, 7],       // 0 top
    [87, 28.5],    // 1 upper-right
    [87, 71.5],    // 2 lower-right
    [50, 93],      // 3 bottom
    [13, 71.5],    // 4 lower-left
    [13, 28.5],    // 5 upper-left
  ];

  // Inner hexagon (r=24)
  const I = [
    [50, 26],      // 0 top
    [70.8, 38],    // 1 upper-right
    [70.8, 62],    // 2 lower-right
    [50, 74],      // 3 bottom
    [29.2, 62],    // 4 lower-left
    [29.2, 38],    // 5 upper-left
  ];

  function pts(coords: number[][]) {
    return coords.map((p) => p.join(',')).join(' ');
  }

  const faces = [
    // Face 0 — top-left (highlight principal, ciano claro)
    { points: [O[5], O[0], I[0], I[5]], id: 'f0' },
    // Face 1 — top-right (ciano médio)
    { points: [O[0], O[1], I[1], I[0]], id: 'f1' },
    // Face 2 — right (azul médio)
    { points: [O[1], O[2], I[2], I[1]], id: 'f2' },
    // Face 3 — bottom-right (azul escuro)
    { points: [O[2], O[3], I[3], I[2]], id: 'f3' },
    // Face 4 — bottom (navy muito escuro)
    { points: [O[3], O[4], I[4], I[3]], id: 'f4' },
    // Face 5 — left (azul médio-escuro)
    { points: [O[4], O[5], I[5], I[4]], id: 'f5' },
  ];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Face 0 — topo-esquerda: ciano brilhante */}
        <linearGradient id="f0" x1="13" y1="7" x2="50" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#b8ecff" />
          <stop offset="100%" stopColor="#6cc8f8" />
        </linearGradient>
        {/* Face 1 — topo-direita: ciano médio */}
        <linearGradient id="f1" x1="50" y1="7" x2="87" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#7dd4f8" />
          <stop offset="100%" stopColor="#3a9ae0" />
        </linearGradient>
        {/* Face 2 — direita: azul médio */}
        <linearGradient id="f2" x1="70" y1="28" x2="87" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#2e7dd4" />
          <stop offset="100%" stopColor="#1854b0" />
        </linearGradient>
        {/* Face 3 — baixo-direita: azul escuro */}
        <linearGradient id="f3" x1="87" y1="72" x2="50" y2="93" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1444a0" />
          <stop offset="100%" stopColor="#0c2c7a" />
        </linearGradient>
        {/* Face 4 — baixo: navy profundo */}
        <linearGradient id="f4" x1="50" y1="93" x2="13" y2="72" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#091f60" />
          <stop offset="100%" stopColor="#05103a" />
        </linearGradient>
        {/* Face 5 — esquerda: azul médio-escuro */}
        <linearGradient id="f5" x1="13" y1="72" x2="13" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#0e3490" />
          <stop offset="100%" stopColor="#1e5cc8" />
        </linearGradient>

        {/* Borda exterior sutil */}
        <linearGradient id="outerEdge" x1="13" y1="7" x2="87" y2="93" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#90d8ff" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#0a1e50" stopOpacity="0.2" />
        </linearGradient>

        {/* Brilho interno */}
        <radialGradient id="innerGlow" cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#1a4a8a" stopOpacity="0.6"/>
          <stop offset="100%" stopColor="#050d22" stopOpacity="1"/>
        </radialGradient>
      </defs>

      {/* ── Fundo escuro do interior (buraco) ── */}
      <polygon
        points={pts(I)}
        fill="url(#innerGlow)"
      />

      {/* ── 6 faces do anel hexagonal ── */}
      {faces.map(({ points, id }) => (
        <polygon
          key={id}
          points={pts(points)}
          fill={`url(#${id})`}
        />
      ))}

      {/* ── Separadores entre faces (linhas suaves) ── */}
      {O.map((p, i) => {
        const next = O[(i + 1) % 6];
        const iCur = I[i];
        return (
          <line
            key={`sep-${i}`}
            x1={p[0]}    y1={p[1]}
            x2={iCur[0]} y2={iCur[1]}
            stroke="#0a1a40"
            strokeWidth="0.6"
            opacity="0.7"
          />
        );
      })}

      {/* ── Borda exterior ── */}
      <polygon
        points={pts(O)}
        fill="none"
        stroke="url(#outerEdge)"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function OperisLogoFull({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const titleColor = variant === 'light' ? '#0f172a' : '#ffffff';
  const subtitleColor = variant === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className="flex items-center gap-2.5 overflow-hidden">
      <div className="flex-shrink-0">
        <OperisLogoMark size={40} />
      </div>

      <div className="overflow-hidden flex flex-col justify-center">
        {/* OPERIS */}
        <div
          className="leading-none font-black flex items-end"
          style={{
            fontFamily: "'Segoe UI', 'Arial Black', Arial, sans-serif",
            fontSize: '1.05rem',
            letterSpacing: '0.16em',
            color: titleColor,
          }}
        >
          <span>OP</span>
          <span className="relative inline-block">
            <span>E</span>
            <span
              className="absolute left-0 right-0"
              style={{ height: '2px', background: '#3b8fd4', bottom: '36%', borderRadius: 1 }}
            />
          </span>
          <span>RIS</span>
        </div>

        {/* — CENTRAL OPERACIONAL INDUSTRIAL — */}
        <div className="flex items-center mt-1" style={{ gap: '3px' }}>
          <span style={{ display:'block', width:'8px', height:'1px', background:'#3b8fd4', flexShrink:0 }} />
          <span
            className="uppercase overflow-hidden"
            style={{
              fontSize: '5.5px',
              fontFamily: "'Segoe UI', Arial, sans-serif",
              fontWeight: 600,
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              color: subtitleColor,
            }}
          >
            Central Operacional Industrial
          </span>
          <span style={{ display:'block', width:'8px', height:'1px', background:'#3b8fd4', flexShrink:0 }} />
        </div>
      </div>
    </div>
  );
}
