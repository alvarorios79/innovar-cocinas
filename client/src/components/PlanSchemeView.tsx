import type { SchemeData, SchemeBlock } from "@shared/kitchenPlanScheme";

// Dibujo de frente (solo lectura) del plano de módulos: una pared tras otra, superiores arriba e inferiores abajo,
// módulos de piso a techo como bloque alto, ventanas, cotas con la medida de cada módulo y regla en metros.
const S = 100;        // unidades por metro dentro del dibujo (el SVG se ajusta al ancho disponible)
const LANE = 64;      // alto de cada línea
const GAP = 8;        // franja entre superiores e inferiores
const TOP = 22;       // espacio para el título de la pared

const COLORS = {
  upper: { fill: "rgba(126,87,194,0.35)", stroke: "#B39DDB", text: "#EDE7F6" },
  lower: { fill: "rgba(0,150,136,0.35)", stroke: "#4DB6AC", text: "#E0F2F1" },
  tall: { fill: "rgba(239,108,0,0.35)", stroke: "#FFB74D", text: "#FFF3E0" },
  window: { fill: "rgba(3,155,229,0.28)", stroke: "#4FC3F7", text: "#E1F5FE" },
};

function Block({ b, y, h, showPaint }: { b: SchemeBlock; y: number; h: number; showPaint: boolean }) {
  const c = b.kind === "window" ? COLORS.window : b.kind === "tall" ? COLORS.tall : COLORS[b.lane === "upper" ? "upper" : "lower"];
  const x = b.x * S, w = b.w * S;
  const narrow = w < 46;
  const noPaint = showPaint && b.kind !== "window" && !b.painted;
  const cx = x + w / 2;
  const fs = narrow ? 9 : 10.5;
  return (
    <g opacity={b.faded ? 0.5 : 1}>
      <rect x={x + 1} y={y} width={Math.max(w - 2, 2)} height={h} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={1.2} strokeDasharray={noPaint ? "4 3" : undefined} />
      {noPaint && <rect x={x + 1} y={y} width={Math.max(w - 2, 2)} height={h} rx={3} fill="url(#schemeHatch)" />}
      {narrow ? (
        <text transform={`translate(${cx + 3},${y + h / 2 - 8}) rotate(-90)`} fill={c.text} fontSize={fs} textAnchor="middle">{b.label}</text>
      ) : (
        <text x={cx} y={y + h / 2 - 4} fill={c.text} fontSize={fs} fontWeight={600} textAnchor="middle">{b.label}</text>
      )}
      {/* cota */}
      <line x1={x + 5} y1={y + h - 12} x2={x + w - 5} y2={y + h - 12} stroke={c.text} strokeWidth={0.8} opacity={0.8} />
      <line x1={x + 5} y1={y + h - 15} x2={x + 5} y2={y + h - 9} stroke={c.text} strokeWidth={0.8} opacity={0.8} />
      <line x1={x + w - 5} y1={y + h - 15} x2={x + w - 5} y2={y + h - 9} stroke={c.text} strokeWidth={0.8} opacity={0.8} />
      <text x={cx} y={y + h - 3} fill={c.text} fontSize={9.5} fontFamily="monospace" textAnchor="middle">{b.w.toFixed(2)}</text>
      {showPaint && b.kind !== "window" && b.painted && <text x={x + w - 8} y={y + 11} fontSize={10} textAnchor="middle">🎨</text>}
      {b.lockAt && <text x={x + 8} y={y + 11} fontSize={9} textAnchor="middle">🔒</text>}
    </g>
  );
}

export function PlanSchemeView({ scheme, showPaint = true }: { scheme: SchemeData; showPaint?: boolean }) {
  return (
    <div className="space-y-4">
      {scheme.walls.filter(w => w.blocks.length || w.length).map((wall, i) => {
        const width = wall.extent * S + 16;
        const tall = wall.blocks.filter(b => b.lane === "tall");
        const lanes = wall.isIsland ? 1 : 2;
        const lowerY = TOP + (wall.isIsland ? 0 : LANE + GAP);
        const height = TOP + lanes * LANE + (lanes - 1) * GAP + 26;
        const ticks: number[] = [];
        for (let m = 0; m <= wall.extent + 0.001; m += 0.5) ticks.push(m);
        return (
          <div key={i} className="overflow-x-auto">
            <svg viewBox={`-8 0 ${width} ${height}`} width="100%" style={{ minWidth: Math.min(width, 520) }} role="img" aria-label={`Esquema ${wall.name}`}>
              <defs>
                <pattern id="schemeHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
                </pattern>
              </defs>
              <text x={0} y={13} fill="#E5E7EB" fontSize={12} fontWeight={700}>
                {wall.name}{wall.length > 0 ? ` · ${wall.length.toFixed(2)} m` : ""}{wall.isIsland ? " (isla)" : ""}
              </text>
              {!wall.isIsland && <rect x={0} y={TOP} width={wall.extent * S} height={LANE} rx={3} fill="rgba(255,255,255,0.03)" />}
              <rect x={0} y={lowerY} width={wall.extent * S} height={LANE} rx={3} fill="rgba(255,255,255,0.03)" />
              {wall.blocks.filter(b => b.lane === "upper").map((b, k) => <Block key={`u${k}`} b={b} y={TOP} h={LANE} showPaint={showPaint} />)}
              {wall.blocks.filter(b => b.lane === "lower").map((b, k) => <Block key={`l${k}`} b={b} y={lowerY} h={LANE} showPaint={showPaint} />)}
              {tall.map((b, k) => <Block key={`t${k}`} b={b} y={TOP} h={lanes * LANE + (lanes - 1) * GAP} showPaint={showPaint} />)}
              {/* regla */}
              {ticks.map(m => (
                <g key={m}>
                  <line x1={m * S} y1={height - 24} x2={m * S} y2={height - (m % 1 === 0 ? 17 : 20)} stroke="#9CA3AF" strokeWidth={0.8} />
                  {m % 1 === 0 && <text x={m * S} y={height - 6} fill="#9CA3AF" fontSize={9.5} textAnchor="middle">{m} m</text>}
                </g>
              ))}
            </svg>
          </div>
        );
      })}
    </div>
  );
}
