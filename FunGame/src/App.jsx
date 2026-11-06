import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Wheel from './Wheel.jsx'
import { sound } from './sound.js'

const BET_TIME = 30
const SPIN_MS = 6000
const PAYOUT = 9
const BONUS_CHANCE = 0.15 // x2 round
const AUTO_TAKE_MS = 6000
const START_SCORE = 10000
const CHIPS = [1, 5, 10, 50, 100, 500, 1000, 5000]
const STAGE_W = 1280
const STAGE_H = 720
const EMPTY = () => Array(10).fill(0)

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

const easeOut = (t) => 1 - Math.pow(1 - t, 4)

export default function App() {
  const [score, setScore] = useState(() => load('ls10_score', START_SCORE))
  const [history, setHistory] = useState(() => load('ls10_history', []))
  const [bets, setBets] = useState(EMPTY)
  const [prevBets, setPrevBets] = useState(null)
  const [chip, setChip] = useState(10)
  const [time, setTime] = useState(BET_TIME)
  const [phase, setPhase] = useState('betting') // betting | spinning | result
  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState(null)
  const [bonus, setBonus] = useState(false)
  const [winner, setWinner] = useState(0)
  const [message, setMessage] = useState('Place your bets!')
  const [muted, setMuted] = useState(() => load('ls10_muted', false))
  const [scale, setScale] = useState(1)
  const [mobile, setMobile] = useState(false)
  const [coins, setCoins] = useState([])

  const betsRef = useRef(bets)
  betsRef.current = bets
  const rotRef = useRef(0)
  const rafRef = useRef(0)
  const hubRef = useRef(null)
  const winnerRef = useRef(null)
  const scoreRef = useRef(null)
  const coinId = useRef(0)

  const totalBet = bets.reduce((a, b) => a + b, 0)

  useEffect(() => save('ls10_score', score), [score])
  useEffect(() => save('ls10_history', history), [history])
  useEffect(() => {
    save('ls10_muted', muted)
    sound.setMuted(muted)
  }, [muted])
  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  // Fit the fixed 16:9 stage into the viewport
  useLayoutEffect(() => {
    const fit = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      setScale(Math.min(w / STAGE_W, h / STAGE_H))
      setMobile(h > w && w < 820)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // Betting countdown
  useEffect(() => {
    if (phase !== 'betting') return
    if (time <= 0) {
      startSpin()
      return
    }
    if (time <= 5) sound.beep()
    const t = setTimeout(() => setTime((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, time])

  // Auto-take
  useEffect(() => {
    if (phase !== 'result') return
    const t = setTimeout(takeAndNext, AUTO_TAKE_MS)
    return () => clearTimeout(t)
  }, [phase, winner])

  function flyCoins(fromEl, toEl, count = 14) {
    if (!fromEl || !toEl) return
    const a = fromEl.getBoundingClientRect()
    const b = toEl.getBoundingClientRect()
    const x0 = a.left + a.width / 2
    const y0 = a.top + a.height / 2
    const x1 = b.left + b.width / 2
    const y1 = b.top + b.height / 2
    const batch = Array.from({ length: count }, (_, i) => ({
      id: ++coinId.current,
      x0: x0 + (Math.random() - 0.5) * 60,
      y0: y0 + (Math.random() - 0.5) * 60,
      dx: x1 - x0,
      dy: y1 - y0,
      delay: i * 45,
    }))
    setCoins((c) => [...c, ...batch])
    batch.forEach((c) => setTimeout(() => sound.coin(), c.delay + 600))
    const ids = new Set(batch.map((c) => c.id))
    setTimeout(() => setCoins((c) => c.filter((x) => !ids.has(x.id))), count * 45 + 1000)
  }

  function startSpin() {
    const n = Math.floor(Math.random() * 10)
    const isBonus = Math.random() < BONUS_CHANCE
    setPhase('spinning')
    setResult(null)
    setMessage('Bet Time Over.')
    sound.lastBeep()

    const from = rotRef.current
    const cur = ((from % 360) + 360) % 360
    let delta = n * 36 - cur
    if (delta < 0) delta += 360
    const to = from + 360 * 7 + delta
    const start = performance.now()
    let lastSeg = Math.floor((from + 18) / 36)

    const step = (now) => {
      const t = Math.min(1, (now - start) / SPIN_MS)
      const r = from + (to - from) * easeOut(t)
      const seg = Math.floor((r + 18) / 36)
      if (seg !== lastSeg) {
        lastSeg = seg
        sound.tick()
      }
      rotRef.current = r
      setRotation(r)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
      else finishSpin(n, isBonus)
    }
    rafRef.current = requestAnimationFrame(step)
  }

  function finishSpin(n, isBonus) {
    const placed = betsRef.current
    const win = placed[n] * PAYOUT * (isBonus ? 2 : 1)
    setResult(n)
    setBonus(isBonus)
    setWinner(win)
    setHistory((h) => [n, ...h].slice(0, 10))
    if (placed.some((b) => b > 0)) setPrevBets(placed)
    setPhase('result')
    if (isBonus) sound.bonus()
    if (win > 0) {
      setTimeout(() => sound.win(), isBonus ? 450 : 0)
      setTimeout(() => flyCoins(hubRef.current, winnerRef.current, 16), 300)
      setMessage(`${isBonus ? 'x2 BONUS! ' : ''}Number ${n}! You won ${win}. Press TAKE.`)
    } else {
      if (placed.some((b) => b > 0)) sound.lose()
      setMessage(`${isBonus ? 'x2 BONUS round. ' : ''}Number ${n}. Better luck next time!`)
    }
  }

  function takeAndNext() {
    if (winner > 0) {
      flyCoins(winnerRef.current, scoreRef.current, 12)
      setScore((s) => s + winner)
    }
    setWinner(0)
    setBets(EMPTY())
    setBonus(false)
    setTime(BET_TIME)
    setPhase('betting')
    setMessage('Place your bets!')
  }

  function placeBet(i) {
    sound.unlock()
    if (phase !== 'betting' || time <= 0) return setMessage('Bet Time Over.')
    if (score < chip) return setMessage('Not enough score!')
    sound.chip()
    setScore((s) => s - chip)
    setBets((b) => b.map((v, k) => (k === i ? v + chip : v)))
    setMessage(`Bet ${chip} on ${i}`)
  }

  function pickChip(c) {
    sound.unlock()
    sound.select()
    setChip(c)
  }

  function cancelBet() {
    if (phase !== 'betting' || totalBet === 0) return
    sound.cancel()
    setScore((s) => s + totalBet)
    setBets(EMPTY())
    setMessage('Bets cancelled.')
  }

  function repeatPrev() {
    if (phase !== 'betting' || !prevBets) return setMessage('No previous bet.')
    const need = prevBets.reduce((a, b) => a + b, 0)
    if (score + totalBet < need) return setMessage('Not enough score for previous bet!')
    sound.chip()
    setScore((s) => s + totalBet - need)
    setBets(prevBets.slice())
    setMessage('Previous bet placed.')
  }

  function exitGame() {
    if (!confirm('Exit and reset score?')) return
    cancelAnimationFrame(rafRef.current)
    setScore(START_SCORE)
    setHistory([])
    setBets(EMPTY())
    setPrevBets(null)
    setTime(BET_TIME)
    setPhase('betting')
    setResult(null)
    setBonus(false)
    setWinner(0)
    setMessage('Game reset. Place your bets!')
  }

  async function goFullscreen() {
    sound.unlock()
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      await screen.orientation?.lock?.('landscape')
    } catch {
      /* not supported (e.g. iOS / desktop) */
    }
  }

  const mm = String(Math.floor(time / 60))
  const ss = String(time % 60).padStart(2, '0')
  const showResult = phase === 'result'

  const iconBar = (
    <div className="topbar">
      <button className="icon-btn" onClick={() => setMuted((m) => !m)} title="Sound">
        {muted ? '🔇' : '🔊'}
      </button>
      <button className="icon-btn" onClick={goFullscreen} title="Full screen">
        ⛶
      </button>
    </div>
  )
  const scoreBox = <Box label="Score" value={score.toFixed(2)} boxRef={scoreRef} />
  const timeBox = <Box label="Time" value={`${mm} : ${ss}`} warn={phase === 'betting' && time <= 5} />
  const winnerBox = <Box label="Winner" value={winner} highlight={winner > 0} boxRef={winnerRef} />
  const historyBox = <Box label="Last 10 Data" value={history.join(' ') || '-'} small />
  const chipRow = (list) => (
    <div className="chips">
      {list.map((c) => (
        <Chip key={c} value={c} active={chip === c} onClick={() => pickChip(c)} />
      ))}
    </div>
  )
  const wheel = (
    <div className="center" ref={hubRef}>
      <Wheel
        rotation={rotation}
        spinning={phase === 'spinning'}
        result={result}
        bonus={bonus}
        showResult={showResult}
      />
    </div>
  )
  const banner = (
    <div className="banner">
      LUCKY SPIN 10
      {bonus && showResult && <span className="banner-x2">x2 BONUS</span>}
    </div>
  )
  const takeBtn = (
    <button className="btn take" onClick={takeAndNext} disabled={phase !== 'result'}>
      Take
    </button>
  )
  const cancelBtn = (
    <button className="btn" onClick={cancelBet} disabled={phase !== 'betting' || !totalBet}>
      Cancel Bet
    </button>
  )
  const prevBtn = (
    <button className="btn" onClick={repeatPrev} disabled={phase !== 'betting'}>
      Prev Bet
    </button>
  )
  const total = <div className="total">Total Bet: {totalBet}</div>
  const board = (
    <div className="board">
      {Array.from({ length: 10 }, (_, k) => {
        const i = (k + 1) % 10 // 1..9, 0
        return (
          <button
            key={i}
            className={`slot ${result === i && showResult ? 'won' : ''}`}
            onClick={() => placeBet(i)}
          >
            <span className="slot-bet">{bets[i] || ''}</span>
            <span className="slot-num">{i}</span>
          </button>
        )
      })}
    </div>
  )
  const status = (
    <div className="status">
      <div className="msg">{message}</div>
      <button className="btn exit" onClick={exitGame}>
        Exit
      </button>
    </div>
  )

  return (
    <div className={`stage ${mobile ? 'is-mobile' : ''}`}>
      {mobile ? (
        <div className="game mobile">
          <div className="m-stats">
            {scoreBox}
            {timeBox}
            {winnerBox}
            {iconBar}
          </div>
          {historyBox}
          {wheel}
          {banner}
          {chipRow(CHIPS)}
          <div className="m-total">{total}</div>
          {board}
          <div className="actions">
            {takeBtn}
            {cancelBtn}
            {prevBtn}
          </div>
          {status}
        </div>
      ) : (
        <div
          className="game"
          style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}
        >
          {iconBar}
          <header className="top">
            <div className="panel left">
              {scoreBox}
              {timeBox}
              {chipRow(CHIPS.slice(0, 4))}
            </div>
            {wheel}
            <div className="panel right">
              {winnerBox}
              {historyBox}
              {chipRow(CHIPS.slice(4))}
            </div>
          </header>
          {banner}
          <section className="controls">
            <div className="actions">
              {takeBtn}
              {cancelBtn}
              {total}
              {prevBtn}
            </div>
            {board}
            {status}
          </section>
        </div>
      )}

      {coins.map((c) => (
        <span
          key={c.id}
          className="coin"
          style={{
            left: c.x0,
            top: c.y0,
            '--dx': `${c.dx}px`,
            '--dy': `${c.dy}px`,
            animationDelay: `${c.delay}ms`,
          }}
        />
      ))}
    </div>
  )
}

function Box({ label, value, warn, highlight, small, boxRef }) {
  return (
    <div className="box">
      <div className="box-label">{label}</div>
      <div
        ref={boxRef}
        className={`box-value ${warn ? 'warn' : ''} ${highlight ? 'hl' : ''} ${small ? 'small' : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

function Chip({ value, active, onClick }) {
  return (
    <button className={`chip c${value} ${active ? 'active' : ''}`} onClick={onClick}>
      {value}
    </button>
  )
}
