import { useState, useEffect, useRef, useCallback, useMemo } from "react";

function generatePriceData(basePrice, numPoints, volatility) {
  const prices = [basePrice];
  let price = basePrice;
  for (let i = 1; i < numPoints; i++) {
    const drift = (Math.random() - 0.502) * volatility;
    const jump = Math.random() < 0.03 ? (Math.random() - 0.5) * volatility * 4 : 0;
    price += drift + jump;
    price = Math.max(basePrice - 8, Math.min(basePrice + 8, price));
    prices.push(Math.round(price * 100) / 100);
  }
  return prices;
}

function computeSMA(data, w) {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < w - 1) { sma.push(null); continue; }
    let s = 0;
    for (let j = i - w + 1; j <= i; j++) s += data[j];
    sma.push(s / w);
  }
  return sma;
}

const BASE = 2993.0;
const PRICE_DATA = generatePriceData(BASE, 1500, 0.7);
const SMA_DATA = computeSMA(PRICE_DATA, 12);
const TICK_MS = 120;
const GRID_COLS = 7;
const GRID_ROWS = 13;
const PSTEP = 0.5;
const TICKS_COL = 15;
const HIST_TICKS = 80;
const BET_SIZES = [1, 5, 10, 50];

function calcMult(distFromCenter, col) {
  const d = Math.abs(distFromCenter);
  const tf = 1 + (GRID_COLS - col - 1) * 0.12;
  const pf = 1 + d * 0.65 + d * d * 0.1;
  return Math.round(Math.min(1.6 + (pf * tf - 1) * 1.05, 35) * 100) / 100;
}

export default function Spike() {
  const [tick, setTick] = useState(HIST_TICKS);
  const [bets, setBets] = useState([]);
  const [balance, setBalance] = useState(1000);
  const [betSize, setBetSize] = useState(5);
  const [toasts, setToasts] = useState([]);
  const [floats, setFloats] = useState([]);
  const [running, setRunning] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const toastId = useRef(0);
  const floatId = useRef(0);

  const currentPrice = PRICE_DATA[tick] || BASE;
  const gridCenter = useMemo(() => Math.round(currentPrice * 2) / 2, [Math.round(currentPrice * 2)]);
  const priceRows = useMemo(() => {
    const rows = [];
    const top = gridCenter + Math.floor(GRID_ROWS / 2) * PSTEP;
    for (let i = 0; i < GRID_ROWS; i++) rows.push(Math.round((top - i * PSTEP) * 100) / 100);
    return rows;
  }, [gridCenter]);
  const centerRow = Math.floor(GRID_ROWS / 2);

  const totalVisTicks = HIST_TICKS + GRID_COLS * TICKS_COL;
  const minP = priceRows[priceRows.length - 1] - PSTEP;
  const maxP = priceRows[0] + PSTEP;
  const startTick = tick - HIST_TICKS;

  const getContainerSize = useCallback(() => {
    if (!containerRef.current) return { w: 1, h: 1 };
    const r = containerRef.current.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }, []);

  const toX = useCallback((t) => {
    const { w } = getContainerSize();
    return ((t - startTick) / totalVisTicks) * w;
  }, [startTick, totalVisTicks, getContainerSize]);

  const toY = useCallback((p) => {
    const { h } = getContainerSize();
    return h - ((p - minP) / (maxP - minP)) * h;
  }, [minP, maxP, getContainerSize]);

  // Advance
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick(p => p >= PRICE_DATA.length - GRID_COLS * TICKS_COL - 10 ? p : p + 1), TICK_MS);
    return () => clearInterval(t);
  }, [running]);

  // Settle bets — INSTANT win when line touches the row, miss only after full column passes
  useEffect(() => {
    const cp = PRICE_DATA[tick];
    if (cp === undefined) return;

    setBets(prev => {
      let totalWin = 0;
      const updated = prev.map(bet => {
        if (bet.status !== "active") return bet;

        const colStart = bet.targetTick - TICKS_COL;
        const colEnd = bet.targetTick;

        // Is the line currently inside this bet's column?
        if (tick >= colStart && tick <= colEnd) {
          // Is current price touching this bet's row?
          const halfBand = PSTEP * 0.55;
          if (cp >= bet.priceLevel - halfBand && cp <= bet.priceLevel + halfBand) {
            // INSTANT WIN
            const payout = Math.round(bet.amount * bet.multiplier * 100) / 100;
            totalWin += payout;
            const fid = ++floatId.current;
            setFloats(f => [...f, { id: fid, amount: payout, targetTick: tick, priceLevel: bet.priceLevel }]);
            setTimeout(() => setFloats(f => f.filter(x => x.id !== fid)), 2000);
            return { ...bet, status: "won", payout };
          }
        }

        // Line has fully passed through the column without hitting — miss
        if (tick > colEnd) {
          return { ...bet, status: "missed" };
        }

        return bet;
      });

      if (totalWin > 0) {
        setBalance(b => Math.round((b + totalWin) * 100) / 100);
        const id = ++toastId.current;
        setToasts(t => [...t, { id, amount: totalWin }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
      }
      return updated;
    });
  }, [tick]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);

    const _toX = (t) => ((t - startTick) / totalVisTicks) * W;
    const _toY = (p) => H - ((p - minP) / (maxP - minP)) * H;

    // Row bands
    for (let i = 0; i < priceRows.length; i++) {
      if (i % 2 === 0) {
        const y1 = _toY(priceRows[i] + PSTEP / 2), y2 = _toY(priceRows[i] - PSTEP / 2);
        ctx.fillStyle = "rgba(180,60,120,0.015)";
        ctx.fillRect(0, y1, W, y2 - y1);
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(180,60,120,0.05)"; ctx.lineWidth = 1;
    priceRows.forEach(p => { const y = _toY(p); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
    for (let c = 0; c <= GRID_COLS; c++) { const x = _toX(tick + c * TICKS_COL); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }

    // Current price row
    ctx.fillStyle = "rgba(233,30,140,0.04)";
    ctx.fillRect(0, _toY(currentPrice + PSTEP / 2), W, _toY(currentPrice - PSTEP / 2) - _toY(currentPrice + PSTEP / 2));

    // Ghost
    const gs = Math.max(0, startTick - 30);
    if (gs < Math.max(0, startTick)) {
      ctx.beginPath(); ctx.strokeStyle = "rgba(233,30,140,0.1)"; ctx.lineWidth = 1.5;
      PRICE_DATA.slice(gs, Math.max(0, startTick) + 1).forEach((p, i) => { const x = _toX(gs + i), y = _toY(p); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
    }

    // Main line
    const ls = Math.max(0, startTick);
    const sl = PRICE_DATA.slice(ls, tick + 1);
    if (sl.length > 1) {
      ctx.beginPath(); ctx.strokeStyle = "rgba(233,30,140,0.18)"; ctx.lineWidth = 8;
      sl.forEach((p, i) => { const x = _toX(ls + i), y = _toY(p); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = "#E91E8C"; ctx.lineWidth = 2.5;
      sl.forEach((p, i) => { const x = _toX(ls + i), y = _toY(p); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.stroke();

      if (showSMA) {
        const smaS = SMA_DATA.slice(ls, tick + 1);
        ctx.beginPath(); ctx.strokeStyle = "rgba(100,200,255,0.45)"; ctx.lineWidth = 1.8; ctx.setLineDash([5, 3]);
        let st = false;
        smaS.forEach((v, i) => { if (v === null) return; const x = _toX(ls + i), y = _toY(v); if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); });
        ctx.stroke(); ctx.setLineDash([]);
      }

      const lx = _toX(tick), ly = _toY(PRICE_DATA[tick]);
      ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fillStyle = "rgba(233,30,140,0.06)"; ctx.fill();
      ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.shadowColor = "#E91E8C"; ctx.shadowBlur = 16; ctx.fill(); ctx.shadowBlur = 0;
    }
  }, [tick, priceRows, currentPrice, showSMA, startTick, minP, maxP, totalVisTicks]);

  const placeBet = useCallback((rowIdx, colIdx) => {
    if (balance < betSize) return;
    const priceLevel = priceRows[rowIdx];
    const dist = rowIdx - centerRow;
    const mult = calcMult(dist, colIdx);
    const targetTick = tick + (colIdx + 1) * TICKS_COL;
    setBalance(b => Math.round((b - betSize) * 100) / 100);
    setBets(prev => [...prev, {
      id: Date.now() + Math.random(),
      rowIdx, colIdx, priceLevel,
      amount: betSize, multiplier: mult,
      targetTick, status: "active", payout: 0,
    }]);
  }, [betSize, balance, tick, priceRows, centerRow]);

  const getBetAtCell = useCallback((r, c) => {
    const tt = tick + (c + 1) * TICKS_COL;
    return bets.find(b => b.status === "active" && b.rowIdx === r && Math.abs(b.targetTick - tt) < TICKS_COL / 2);
  }, [bets, tick]);

  // Visible bets: active ones + missed ones still on screen (won ones disappear)
  const visibleBets = bets.filter(b => {
    if (b.status === "won") return false;
    const x = toX(b.targetTick - TICKS_COL / 2);
    const { w } = getContainerSize();
    return x > -100 && x < w + 100;
  });

  const activeBetCount = bets.filter(b => b.status === "active").length;
  const wonCount = bets.filter(b => b.status === "won").length;
  const lostCount = bets.filter(b => b.status === "missed").length;

  const resetGame = () => {
    setBalance(1000); setBets([]); setTick(HIST_TICKS);
    setToasts([]); setFloats([]); setRunning(true);
  };

  const gridLeftPct = (HIST_TICKS / totalVisTicks) * 100;

  return (
    <div style={{
      background: "#0D0815", minHeight: "100vh", width: "100vw", color: "#fff",
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      position: "relative", overflow: "hidden", userSelect: "none",
    }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.025, zIndex: 0, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Toasts */}
      <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: "rgba(255,255,255,0.95)", color: "#0D0815", padding: "10px 24px",
            borderRadius: 24, fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", gap: 10,
            animation: "slideDown 0.3s ease-out, fadeOutToast 0.5s 2.5s forwards",
            boxShadow: "0 4px 24px rgba(232,245,74,0.3)", fontFamily: "inherit",
          }}>
            <span style={{ background: "#E8F54A", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#1a1a0a" }}>✦</span>
            You won <span style={{ color: "#16a34a", marginLeft: 4 }}>${t.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ position: "relative", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
        <div style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.35)", borderRadius: 24, padding: "6px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E91E8C", boxShadow: "0 0 8px #E91E8C", animation: "blink 2s ease-in-out infinite" }} />
          <span style={{ color: "#E91E8C", fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>${currentPrice.toFixed(2)}</span>
          <span style={{ fontSize: 10, color: "rgba(233,30,140,0.5)", fontWeight: 600 }}>BTC/USD</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.12)", textTransform: "uppercase" }}>Spike</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowSMA(!showSMA)} style={{ background: showSMA ? "rgba(100,200,255,0.12)" : "rgba(255,255,255,0.06)", border: `1px solid ${showSMA ? "rgba(100,200,255,0.3)" : "rgba(255,255,255,0.12)"}`, borderRadius: 10, padding: "6px 10px", color: showSMA ? "rgba(100,200,255,0.8)" : "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>SMA</button>
          <button onClick={() => setRunning(!running)} style={{ background: running ? "rgba(233,30,140,0.12)" : "rgba(74,232,106,0.15)", border: `1px solid ${running ? "rgba(233,30,140,0.3)" : "rgba(74,232,106,0.3)"}`, borderRadius: 10, padding: "6px 14px", color: running ? "#E91E8C" : "#4AE86A", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>{running ? "⏸" : "▶"}</button>
          <button onClick={resetGame} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "6px 14px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>↻</button>
        </div>
      </div>

      {/* Main game area */}
      <div ref={containerRef} style={{ position: "relative", zIndex: 10, height: "calc(100vh - 120px)", margin: "0 8px" }}>
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }} />

        {/* Bet blocks — absolutely positioned, scroll with chart */}
        {visibleBets.map(bet => {
          const x = toX(bet.targetTick - TICKS_COL / 2);
          const y = toY(bet.priceLevel);
          const { w, h } = getContainerSize();
          const cellW = w / totalVisTicks * TICKS_COL;
          const cellH = h / (maxP - minP) * PSTEP;
          const isMissed = bet.status === "missed";

          return (
            <div key={bet.id} style={{
              position: "absolute",
              left: x - cellW / 2,
              top: y - cellH / 2,
              width: cellW,
              height: cellH,
              zIndex: 15,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              borderRadius: 7, fontWeight: 800, pointerEvents: "none",
              transition: "opacity 0.4s ease, filter 0.4s ease",
              ...(isMissed ? {
                background: "rgba(120,110,80,0.45)",
                color: "rgba(200,190,150,0.4)",
                opacity: 0.5, filter: "saturate(0.15)",
              } : {
                background: "#E8F54A",
                color: "#1a1a0a",
                boxShadow: "0 2px 14px rgba(232,245,74,0.4), 0 0 0 1px rgba(232,245,74,0.2)",
                animation: "popIn 0.25s ease-out",
              }),
            }}>
              <span style={{ fontSize: 13, lineHeight: 1 }}>${bet.amount}</span>
              <span style={{ fontSize: 9, opacity: 0.65, lineHeight: 1, marginTop: 2 }}>{bet.multiplier}X</span>
            </div>
          );
        })}

        {/* Floating +$XX at exact hit location */}
        {floats.map(f => {
          const x = toX(f.targetTick);
          const y = toY(f.priceLevel);
          return (
            <div key={f.id} style={{
              position: "absolute", left: x - 40, top: y - 30, zIndex: 100,
              color: "#E8F54A", fontWeight: 900, fontSize: 18,
              textShadow: "0 0 16px rgba(232,245,74,0.8), 0 2px 4px rgba(0,0,0,0.5)",
              animation: "floatUp 2s ease-out forwards",
              pointerEvents: "none", whiteSpace: "nowrap",
            }}>+${f.amount.toFixed(1)}</div>
          );
        })}

        {/* Clickable grid */}
        <div style={{
          position: "absolute", left: `${gridLeftPct}%`, right: 70, top: 0, bottom: 0, zIndex: 20,
          display: "grid", gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        }}>
          {priceRows.map((price, rowIdx) =>
            Array.from({ length: GRID_COLS }, (_, colIdx) => {
              const dist = rowIdx - centerRow;
              const mult = calcMult(dist, colIdx);
              const hasBet = getBetAtCell(rowIdx, colIdx);
              const near = Math.abs(price - currentPrice) < PSTEP * 0.6;
              return (
                <div key={`${rowIdx}-${colIdx}`}
                  onClick={() => { if (!hasBet) placeBet(rowIdx, colIdx); }}
                  style={{
                    position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: hasBet ? "default" : "pointer",
                    borderRight: "1px solid rgba(180,60,120,0.07)", borderBottom: "1px solid rgba(180,60,120,0.07)",
                    transition: "background 0.15s ease",
                    background: near ? "rgba(233,30,140,0.04)" : "transparent",
                  }}
                  onMouseEnter={e => { if (!hasBet) e.currentTarget.style.background = "rgba(232,245,74,0.08)"; }}
                  onMouseLeave={e => { if (!hasBet) e.currentTarget.style.background = near ? "rgba(233,30,140,0.04)" : "transparent"; }}
                >
                  <div style={{ position: "absolute", top: -1.5, left: -1.5, width: 3, height: 3, borderRadius: "50%", background: "rgba(233,30,140,0.2)" }} />
                  {!hasBet && (
                    <span style={{
                      fontSize: 10,
                      color: mult > 12 ? "rgba(233,30,140,0.55)" : mult > 6 ? "rgba(233,30,140,0.38)" : "rgba(233,30,140,0.22)",
                      fontWeight: 600, letterSpacing: -0.3,
                    }}>{mult.toFixed(1)}X</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Y-axis */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 68, zIndex: 30, display: "flex", flexDirection: "column", justifyContent: "space-around", pointerEvents: "none" }}>
          {priceRows.map((p, i) => {
            const cur = Math.abs(p - currentPrice) < PSTEP * 0.6;
            return (
              <div key={i} style={{ fontSize: 10, textAlign: "right", paddingRight: 8, fontWeight: cur ? 800 : 500, color: cur ? "#E91E8C" : "rgba(233,30,140,0.35)", position: "relative" }}>
                {cur ? (
                  <div style={{ position: "absolute", left: -4, top: "50%", transform: "translateY(-50%)", background: "#E91E8C", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", boxShadow: "0 0 12px rgba(233,30,140,0.4)" }}>${p.toFixed(1)}</div>
                ) : `$${p.toFixed(1)}`}
              </div>
            );
          })}
        </div>

        {showSMA && (
          <div style={{ position: "absolute", top: 8, left: 12, zIndex: 30, display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(100,200,255,0.6)", fontWeight: 600 }}>
            <div style={{ width: 16, height: 2, background: "rgba(100,200,255,0.5)", borderRadius: 1 }} /> SMA(12)
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "linear-gradient(transparent, rgba(13,8,21,0.97) 40%)" }}>
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "7px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15 }}>💰</span>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5, color: balance < 50 ? "#ff6b6b" : "#fff" }}>${balance.toFixed(2)}</span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontWeight: 700, letterSpacing: 1 }}>PLAY</span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11, fontWeight: 600 }}>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>● {activeBetCount}</span>
          <span style={{ color: "rgba(74,232,106,0.7)" }}>✦ {wonCount}</span>
          <span style={{ color: "rgba(255,100,100,0.5)" }}>✗ {lostCount}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {BET_SIZES.map(s => (
            <button key={s} onClick={() => setBetSize(s)} style={{
              background: betSize === s ? "#E8F54A" : "rgba(255,255,255,0.06)",
              color: betSize === s ? "#1a1a0a" : "rgba(255,255,255,0.4)",
              border: betSize === s ? "1px solid #E8F54A" : "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "6px 11px", fontWeight: 800, fontSize: 13,
              cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit",
            }}>${s}</button>
          ))}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        @keyframes popIn { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideDown { 0% { transform: translateY(-24px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes fadeOutToast { 0% { opacity: 1; } 100% { opacity: 0; transform: translateY(-10px); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-40px); } }
        body { margin: 0; padding: 0; background: #0D0815; overflow: hidden; }
      `}</style>
    </div>
  );
}
