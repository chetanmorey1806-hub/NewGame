const SEG = 36

function polar(r, deg, c = 150) {
  const a = ((deg - 90) * Math.PI) / 180
  return [c + r * Math.cos(a), c + r * Math.sin(a)]
}

function ring(i, rOut, rIn) {
  const s = i * SEG - SEG / 2
  const e = s + SEG
  const [x1, y1] = polar(rOut, s)
  const [x2, y2] = polar(rOut, e)
  const [x3, y3] = polar(rIn, e)
  const [x4, y4] = polar(rIn, s)
  return `M${x1},${y1} A${rOut},${rOut} 0 0 1 ${x2},${y2} L${x3},${y3} A${rIn},${rIn} 0 0 0 ${x4},${y4} Z`
}

/**
 * Two-ring chakri:
 *  - outer ring is fixed (numbers 0-9 + chasing bulbs)
 *  - inner ring spins and carries the arrow; the number the arrow stops on wins.
 */
export default function Wheel({ rotation, spinning, result, bonus, showResult }) {
  const winIdx = showResult ? result : null
  return (
    <div className={`wheel-wrap ${spinning ? 'spinning' : ''}`}>
      <svg className="wheel" viewBox="0 0 300 300">
        <defs>
          <radialGradient id="rim" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#4c1d95" />
            <stop offset="100%" stopColor="#1e1b4b" />
          </radialGradient>
          <radialGradient id="inner" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#3b0764" />
            <stop offset="100%" stopColor="#0b0618" />
          </radialGradient>
        </defs>

        {/* rim + bulbs */}
        <circle cx="150" cy="150" r="148" fill="url(#rim)" stroke="#f0abfc" strokeWidth="3" />
        {Array.from({ length: 30 }, (_, i) => {
          const [x, y] = polar(140, i * 12)
          return <circle key={i} cx={x} cy={y} r="3.2" className={`bulb b${i % 3}`} />
        })}

        {/* fixed outer number ring */}
        {Array.from({ length: 10 }, (_, i) => {
          const [tx, ty] = polar(113, i * SEG)
          const win = winIdx === i
          return (
            <g key={i}>
              <path
                d={ring(i, 132, 94)}
                className={win ? 'seg-win' : ''}
                fill={win ? '#facc15' : i % 2 ? '#0e7490' : '#6d28d9'}
                stroke="#f5d0fe"
                strokeWidth="1.5"
              />
              <text
                x={tx}
                y={ty}
                transform={`rotate(${i * SEG} ${tx} ${ty})`}
                textAnchor="middle"
                dominantBaseline="central"
                className="wheel-num"
                fill={win ? '#1e1b4b' : '#fff'}
              >
                {i}
              </text>
            </g>
          )
        })}

        {/* spinning inner ring with arrow */}
        <g transform={`rotate(${rotation} 150 150)`}>
          <circle cx="150" cy="150" r="92" fill="url(#inner)" stroke="#a78bfa" strokeWidth="2" />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={ring(i, 90, 62)}
              fill={i % 2 ? 'rgba(34,211,238,.25)' : 'rgba(217,70,239,.25)'}
              stroke="rgba(255,255,255,.25)"
            />
          ))}
          {Array.from({ length: 10 }, (_, i) => {
            const [x, y] = polar(76, i * SEG + SEG / 2)
            return <circle key={i} cx={x} cy={y} r="4" fill="#fde68a" opacity=".8" />
          })}
          {/* arrow */}
          <path d="M150,58 L162,84 L156,84 L156,98 L144,98 L144,84 L138,84 Z" fill="#facc15" stroke="#7c2d12" strokeWidth="1.5" />
        </g>
      </svg>

      <div className={`hub ${showResult ? 'show' : ''} ${bonus && showResult ? 'bonus' : ''}`}>
        {showResult ? (
          <>
            <span className="hub-num">{result}</span>
            {bonus && <span className="hub-x2">x2</span>}
          </>
        ) : (
          <span className="hub-logo">LS10</span>
        )}
      </div>
    </div>
  )
}
