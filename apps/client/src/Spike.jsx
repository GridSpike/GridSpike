import { useState, useEffect, useRef, useCallback, useMemo } from "react";

function computeSMA(data, w) {
  if (data.length < w) return data.map(() => null);
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < w - 1) { sma.push(null); continue; }
    let s = 0;
    for (let j = i - w + 1; j <= i; j++) s += data[j];
    sma.push(s / w);
  }
  return sma;
}

const TICK_MS = 500;
const CELL_SIZE = 35; // Square cells in pixels
const PSTEP = 20;
const TICKS_COL = 5;
const MIN_TICKS_BEFORE_START = 20;
const BET_SIZES = [1, 5, 10, 50];
const SMA_WINDOW = 12;
const MIN_FUTURE_COLS = 3;
const GRID_COLS = 10;
const SLOT_GROUP = 3;

function snapPrice(price) {
  return Math.round(price / PSTEP) * PSTEP;
}

function calcMult(distFromCenter, colIdx) {
  const d = Math.abs(distFromCenter);
  const tf = 1 + (GRID_COLS - colIdx - 1) * 0.12;
  const pf = 1 + d * 0.65 + d * d * 0.1;
  return Math.round(Math.min(1.6 + (pf * tf - 1) * 1.05, 35) / 2 * 100) / 100;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

export default function Spike() {
  const [priceData, setPriceData] = useState([]);
  const [smaData, setSmaData] = useState([]);
  const [tick, setTick] = useState(0);
  const [bets, setBets] = useState([]);
  const [balance, setBalance] = useState(200);
  const [betSize, setBetSize] = useState(5);
  const [toasts, setToasts] = useState([]);
  const [floats, setFloats] = useState([]);
  const [explosions, setExplosions] = useState([]);
  const [running, setRunning] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  // View state - pixel-based pan offsets for smooth scrolling
  const [panOffsetX, setPanOffsetX] = useState(0); // pixels offset from default view
  const [panOffsetY, setPanOffsetY] = useState(0); // pixels offset from default view
  const [zoom, setZoom] = useState(1);
  const [initialPriceLevel, setInitialPriceLevel] = useState(null);

  const lastSettledTick = useRef(-1);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const toastId = useRef(0);
  const floatId = useRef(0);
  const explosionId = useRef(0);
  const wsRef = useRef(null);
  const tradeBufferRef = useRef([]);

  // Pan state
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket("wss://stream.binance.us:9443/ws/btcusd@bookTicker");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to Binance WebSocket");
      setConnectionStatus("connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const bid = parseFloat(data.b);
      const ask = parseFloat(data.a);
      const price = (bid + ask) / 2;
      tradeBufferRef.current.push(price);
    };

    ws.onerror = () => setConnectionStatus("error");
    ws.onclose = () => setConnectionStatus("disconnected");

    const tickInterval = setInterval(() => {
      if (tradeBufferRef.current.length > 0 && running) {
        const avgPrice = tradeBufferRef.current.reduce((a, b) => a + b, 0) / tradeBufferRef.current.length;
        const roundedPrice = Math.round(avgPrice * 100) / 100;

        setPriceData(prev => {
          const newData = [...prev, roundedPrice];
          if (newData.length > 1000) newData.shift();
          setSmaData(computeSMA(newData, SMA_WINDOW));

          // Initialize view center on first price
          if (initialPriceLevel === null && roundedPrice > 0) {
            setInitialPriceLevel(snapPrice(roundedPrice));
          }

          return newData;
        });

        setTick(prev => prev + 1);
        tradeBufferRef.current = [];
      }
    }, TICK_MS);

    return () => {
      clearInterval(tickInterval);
      if (ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [running, initialPriceLevel]);

  const currentPrice = priceData[priceData.length - 1] || 0;
  const isReady = priceData.length >= MIN_TICKS_BEFORE_START && currentPrice > 0;
  const currentPriceLevel = snapPrice(currentPrice);

  // Slot system
  const getSlot = useCallback((t) => Math.floor(t / TICKS_COL), []);
  const currentSlot = getSlot(tick);
  const displaySlot = Math.floor(currentSlot / SLOT_GROUP) * SLOT_GROUP;
  const firstBettableSlot = currentSlot + MIN_FUTURE_COLS;

  // Square cell size with zoom
  const cellSize = CELL_SIZE * zoom;

  const getContainerSize = useCallback(() => {
    if (!containerRef.current) return { w: 800, h: 600 };
    const r = containerRef.current.getBoundingClientRect();
    return { w: r.width - 80, h: r.height - 30 };
  }, []);

  // Calculate visible range based on container size and cell size
  const { w: containerW, h: containerH } = getContainerSize();
  const visibleCols = Math.ceil(containerW / cellSize) + 2;
  const visibleRows = Math.ceil(containerH / cellSize) + 2;

  // Base position (without pan) - current slot at left edge, current price centered
  const basePriceLevel = initialPriceLevel || currentPriceLevel;

  // Visible slots centered on displaySlot (graph left, bets right)
  const halfCols = Math.floor(visibleCols / 2);
  const visibleSlots = useMemo(() => {
    const offsetSlots = Math.floor(panOffsetX / cellSize);
    const startSlot = displaySlot - halfCols - offsetSlots - 1;
    return Array.from({ length: visibleCols + 2 }, (_, i) => startSlot + i);
  }, [displaySlot, halfCols, panOffsetX, cellSize, visibleCols]);

  // Visible price levels (centered on base price, shifted by pan)
  const visiblePriceLevels = useMemo(() => {
    const offsetRows = Math.floor(panOffsetY / cellSize);
    const centerPrice = basePriceLevel + offsetRows * PSTEP;
    const halfRows = Math.floor(visibleRows / 2);
    const levels = [];
    for (let i = 0; i < visibleRows + 2; i++) {
      levels.push(centerPrice + (halfRows - i + 1) * PSTEP);
    }
    return levels;
  }, [basePriceLevel, panOffsetY, cellSize, visibleRows]);

  // Convert slot to X position (in pixels) - centered, with direct pan offset
  const centerX = containerW / 2;
  const slotToX = useCallback((slotNum) => {
    const baseX = (slotNum - displaySlot) * cellSize;
    return centerX + baseX + panOffsetX;
  }, [displaySlot, cellSize, panOffsetX, centerX]);

  // Convert tick to X position
  const toX = useCallback((targetTick) => {
    const slotNum = targetTick / TICKS_COL;
    const baseX = (slotNum - displaySlot) * cellSize;
    return centerX + baseX + panOffsetX;
  }, [displaySlot, cellSize, panOffsetX, centerX]);

  // Convert price to Y position (in pixels)
  const toY = useCallback((price) => {
    const priceRows = (basePriceLevel - price) / PSTEP;
    const centerY = containerH / 2;
    return centerY + priceRows * cellSize + panOffsetY;
  }, [basePriceLevel, cellSize, containerH, panOffsetY]);

  const getSlotWidth = useCallback(() => cellSize, [cellSize]);
  const getRowHeight = useCallback(() => cellSize, [cellSize]);

  // For canvas rendering
  const minVisiblePrice = visiblePriceLevels[visiblePriceLevels.length - 1] - PSTEP;
  const maxVisiblePrice = visiblePriceLevels[0] + PSTEP;
  const minVisibleTick = visibleSlots[0] * TICKS_COL;
  const maxVisibleTick = (visibleSlots[visibleSlots.length - 1] + 1) * TICKS_COL;

  // Mouse handlers for pan
  const handleMouseDown = useCallback((e) => {
    if (e.button === 0) { // Left click
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.style.cursor = 'grabbing';
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    // Direct pixel-based panning - much smoother!
    setPanOffsetX(prev => prev + dx);
    setPanOffsetY(prev => prev + dy);
  }, []);

  const handleMouseUp = useCallback((e) => {
    isDragging.current = false;
    e.currentTarget.style.cursor = 'grab';
  }, []);

  const handleMouseLeave = useCallback((e) => {
    isDragging.current = false;
    e.currentTarget.style.cursor = 'grab';
  }, []);

  // Mouse wheel for zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.5, Math.min(2, prev * zoomFactor)));
  }, []);

  // Reset view to center on current price/time
  const resetView = useCallback(() => {
    setPanOffsetX(0);
    setPanOffsetY(0);
    setZoom(1);
  }, []);

  // Settle bets
  useEffect(() => {
    if (priceData.length === 0) return;
    if (lastSettledTick.current === tick) return;
    lastSettledTick.current = tick;
    const cp = currentPrice;

    setBets(prev => {
      let totalWin = 0;
      const updated = prev.map(bet => {
        if (bet.status !== "active") return bet;

        const slotStartTick = bet.slotNum * TICKS_COL;
        const slotEndTick = (bet.slotNum + 1) * TICKS_COL;

        if (tick >= slotStartTick && tick < slotEndTick) {
          const halfBand = PSTEP * 0.55;
          if (cp >= bet.priceLevel - halfBand && cp <= bet.priceLevel + halfBand) {
            const payout = Math.round(bet.amount * bet.multiplier * 100) / 100;
            totalWin += payout;

            const fid = ++floatId.current;
            const slotMidTick = slotStartTick + TICKS_COL / 2;
            setFloats(f => [...f, { id: fid, amount: payout, targetTick: slotMidTick, priceLevel: bet.priceLevel }]);
            setTimeout(() => setFloats(f => f.filter(x => x.id !== fid)), 2000);

            const eid = ++explosionId.current;
            setExplosions(e => [...e, { id: eid, targetTick: slotMidTick, priceLevel: bet.priceLevel }]);
            setTimeout(() => setExplosions(e => e.filter(x => x.id !== eid)), 800);

            return { ...bet, status: "won", payout };
          }
        }

        if (tick >= slotEndTick) {
          return { ...bet, status: "lost" };
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
  }, [tick, currentPrice]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceData.length === 0) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    ctx.scale(2, 2);
    const W = rect.width - 80;
    const H = rect.height - 30;
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Row bands
    for (let i = 0; i < visiblePriceLevels.length; i++) {
      if (i % 2 === 0) {
        const y = toY(visiblePriceLevels[i]);
        ctx.fillStyle = "rgba(180,60,120,0.015)";
        ctx.fillRect(0, y - cellSize / 2, W + 80, cellSize);
      }
    }

    // Horizontal grid lines
    ctx.strokeStyle = "rgba(180,60,120,0.08)";
    ctx.lineWidth = 1;
    visiblePriceLevels.forEach(p => {
      const y = toY(p);
      ctx.beginPath();
      ctx.moveTo(0, y - cellSize / 2);
      ctx.lineTo(W + 80, y - cellSize / 2);
      ctx.stroke();
    });

    // Vertical grid lines at slot boundaries
    visibleSlots.forEach((slotNum) => {
      const x = slotToX(slotNum);
      const isCurrentSlot = slotNum === currentSlot;
      const isBettable = slotNum >= firstBettableSlot;

      ctx.beginPath();
      if (isCurrentSlot) {
        ctx.strokeStyle = "rgba(233,30,140,0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
      } else {
        ctx.strokeStyle = isBettable ? "rgba(180,60,120,0.12)" : "rgba(180,60,120,0.05)";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
      }
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Current price row highlight
    const curY = toY(currentPriceLevel);
    if (curY >= -cellSize && curY <= H + cellSize) {
      ctx.fillStyle = "rgba(233,30,140,0.06)";
      ctx.fillRect(0, curY - cellSize / 2, W + 80, cellSize);
    }

    // Price line
    const lineStartTick = Math.max(0, minVisibleTick - 10);
    const lineEndTick = Math.min(tick, priceData.length - 1);

    if (lineEndTick >= lineStartTick && priceData.length > lineStartTick) {
      const lineData = [];
      for (let t = Math.max(0, lineStartTick); t <= lineEndTick && t < priceData.length; t++) {
        lineData.push({ tick: t, price: priceData[t] });
      }

      if (lineData.length > 1) {
        // Glow
        ctx.beginPath();
        ctx.strokeStyle = "rgba(233,30,140,0.2)";
        ctx.lineWidth = 8;
        lineData.forEach((d, i) => {
          const x = toX(d.tick);
          const y = toY(d.price);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Line
        ctx.beginPath();
        ctx.strokeStyle = "#E91E8C";
        ctx.lineWidth = 2.5;
        lineData.forEach((d, i) => {
          const x = toX(d.tick);
          const y = toY(d.price);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        });
        ctx.stroke();

        // SMA
        if (showSMA && smaData.length > 0) {
          ctx.beginPath();
          ctx.strokeStyle = "rgba(100,200,255,0.45)";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 3]);
          let started = false;
          for (let t = Math.max(0, lineStartTick); t <= lineEndTick && t < smaData.length; t++) {
            const v = smaData[t];
            if (v === null) continue;
            const x = toX(t);
            const y = toY(v);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Current price dot
        const lastX = toX(tick);
        const lastY = toY(currentPrice);
        if (lastX >= -20 && lastX <= W + 20 && lastY >= -20 && lastY <= H + 20) {
          ctx.beginPath();
          ctx.arc(lastX, lastY, 12, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(233,30,140,0.08)";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.shadowColor = "#E91E8C";
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
  }, [tick, visiblePriceLevels, visibleSlots, currentPrice, currentPriceLevel, showSMA, minVisibleTick, priceData, smaData, currentSlot, firstBettableSlot, cellSize, toX, toY, slotToX]);

  // Place bet
  const placeBet = useCallback((slotNum, priceLevel) => {
    if (balance < betSize) return;
    if (slotNum < firstBettableSlot) return;

    const distFromCenter = (currentPriceLevel - priceLevel) / PSTEP;
    const colIdx = slotNum - currentSlot;
    const mult = calcMult(distFromCenter, Math.max(0, colIdx));

    setBalance(b => Math.round((b - betSize) * 100) / 100);
    setBets(prev => [...prev, {
      id: Date.now() + Math.random(),
      slotNum,
      priceLevel,
      amount: betSize,
      multiplier: mult,
      status: "active",
      payout: 0,
    }]);
  }, [betSize, balance, currentSlot, currentPriceLevel, firstBettableSlot]);

  const getBetAtCell = useCallback((slotNum, priceLevel) => {
    return bets.find(b => b.status === "active" && b.slotNum === slotNum && b.priceLevel === priceLevel);
  }, [bets]);

  // Visible bets - filter based on visible slots and price levels
  const visibleBets = bets.filter(b => {
    if (b.status === "won") return false;
    const isSlotVisible = visibleSlots.includes(b.slotNum);
    const isPriceVisible = visiblePriceLevels.includes(b.priceLevel);
    return isSlotVisible && isPriceVisible;
  });

  const activeBetCount = bets.filter(b => b.status === "active").length;
  const wonCount = bets.filter(b => b.status === "won").length;
  const lostCount = bets.filter(b => b.status === "lost").length;

  const resetGame = () => {
    setBalance(200);
    setBets([]);
    setToasts([]);
    setFloats([]);
    setExplosions([]);
  };

  const getSlotTimeLabel = (slotNum) => {
    const slotEndTick = (slotNum + 1) * TICKS_COL;
    const ticksFromNow = slotEndTick - tick;
    const secondsFromNow = ticksFromNow * (TICK_MS / 1000);
    const futureTime = new Date(Date.now() + secondsFromNow * 1000);
    return formatTime(futureTime);
  };

  return (
    <div style={{
      background: "#0D0815", minHeight: "100vh", width: "100vw", color: "#fff",
      fontFamily: "'JetBrains Mono','Fira Code',monospace",
      position: "relative", overflow: "hidden", userSelect: "none",
    }}>
      <div style={{ position: "fixed", inset: 0, opacity: 0.025, zIndex: 0, pointerEvents: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      {/* Loading Screen */}
      {!isReady && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0815" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 24, animation: "blink 1.5s ease-in-out infinite" }}>📊</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#E91E8C", marginBottom: 8, letterSpacing: 3 }}>SPIKE</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>
              {connectionStatus === "connected" ? "Loading market data..." : connectionStatus === "connecting" ? "Connecting to Binance..." : "Connection failed"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
              {Math.min(priceData.length, MIN_TICKS_BEFORE_START)}/{MIN_TICKS_BEFORE_START} ticks
            </div>
          </div>
        </div>
      )}

      {/* Win Toasts */}
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.35)", borderRadius: 24, padding: "6px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#E91E8C", boxShadow: "0 0 8px #E91E8C", animation: "blink 2s ease-in-out infinite" }} />
            <span style={{ color: "#E91E8C", fontWeight: 800, fontSize: 16, letterSpacing: -0.5 }}>${currentPrice.toFixed(2)}</span>
            <span style={{ fontSize: 10, color: "rgba(233,30,140,0.5)", fontWeight: 600 }}>BTC/USD</span>
          </div>
          <div style={{
            fontSize: 9, fontWeight: 600,
            color: connectionStatus === "connected" ? "#4AE86A" : connectionStatus === "connecting" ? "#E8F54A" : "#ff6b6b",
            background: connectionStatus === "connected" ? "rgba(74,232,106,0.1)" : connectionStatus === "connecting" ? "rgba(232,245,74,0.1)" : "rgba(255,107,107,0.1)",
            padding: "4px 8px", borderRadius: 8,
            border: `1px solid ${connectionStatus === "connected" ? "rgba(74,232,106,0.3)" : connectionStatus === "connecting" ? "rgba(232,245,74,0.3)" : "rgba(255,107,107,0.3)"}`
          }}>
            {connectionStatus === "connected" ? "● LIVE" : connectionStatus === "connecting" ? "○ CONNECTING..." : "✕ DISCONNECTED"}
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>
            Zoom: {(zoom * 100).toFixed(0)}%
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: "rgba(255,255,255,0.12)", textTransform: "uppercase" }}>Spike</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={resetView} style={{ background: "rgba(233,30,140,0.12)", border: "1px solid rgba(233,30,140,0.25)", borderRadius: 10, padding: "6px 10px", color: "#E91E8C", cursor: "pointer", fontSize: 9, fontWeight: 700, fontFamily: "inherit" }}>CENTER</button>
          <button onClick={() => setShowSMA(!showSMA)} style={{ background: showSMA ? "rgba(100,200,255,0.12)" : "rgba(255,255,255,0.06)", border: `1px solid ${showSMA ? "rgba(100,200,255,0.3)" : "rgba(255,255,255,0.12)"}`, borderRadius: 10, padding: "6px 10px", color: showSMA ? "rgba(100,200,255,0.8)" : "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit" }}>SMA</button>
          <button onClick={() => setRunning(!running)} style={{ background: running ? "rgba(233,30,140,0.12)" : "rgba(74,232,106,0.15)", border: `1px solid ${running ? "rgba(233,30,140,0.3)" : "rgba(74,232,106,0.3)"}`, borderRadius: 10, padding: "6px 14px", color: running ? "#E91E8C" : "#4AE86A", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>{running ? "⏸" : "▶"}</button>
          <button onClick={resetGame} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "6px 14px", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>↻</button>
        </div>
      </div>

      {/* Main game area */}
      <div
        ref={containerRef}
        style={{ position: "relative", zIndex: 10, height: "calc(100vh - 120px)", margin: "0 8px", cursor: "grab" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "none" }} />

        {/* Bet chips */}
        {visibleBets.map(bet => {
          const x = slotToX(bet.slotNum);
          const y = toY(bet.priceLevel);
          const isLost = bet.status === "lost";

          return (
            <div key={bet.id} style={{
              position: "absolute",
              left: x,
              top: y - cellSize / 2,
              width: cellSize,
              height: cellSize,
              zIndex: 15,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              borderRadius: 8, fontWeight: 800, pointerEvents: "none",
              ...(isLost ? {
                background: "linear-gradient(135deg, #8B4513 0%, #A0522D 100%)",
                color: "rgba(255,220,180,0.6)",
                opacity: 0.7,
              } : {
                background: "linear-gradient(135deg, #E8F54A 0%, #d4e042 100%)",
                color: "#1a1a0a",
                boxShadow: "0 4px 20px rgba(232,245,74,0.5)",
              }),
            }}>
              <span style={{ fontSize: 14, lineHeight: 1, fontWeight: 900 }}>${bet.amount}</span>
              <span style={{ fontSize: 9, opacity: 0.7, lineHeight: 1, marginTop: 3 }}>{bet.multiplier.toFixed(2)}x</span>
            </div>
          );
        })}

        {/* Explosions */}
        {explosions.map(e => {
          const slotNum = Math.floor(e.targetTick / TICKS_COL);
          const x = slotToX(slotNum) + cellSize / 2;
          const y = toY(e.priceLevel);
          return (
            <div key={e.id} style={{
              position: "absolute", left: x - 50, top: y - 50, width: 100, height: 100,
              zIndex: 50, pointerEvents: "none", borderRadius: "50%",
              background: "radial-gradient(circle, rgba(232,245,74,0.8) 0%, rgba(232,245,74,0) 70%)",
              animation: "explode 0.8s ease-out forwards",
            }} />
          );
        })}

        {/* Floats */}
        {floats.map(f => {
          const slotNum = Math.floor(f.targetTick / TICKS_COL);
          const x = slotToX(slotNum) + cellSize / 2;
          const y = toY(f.priceLevel);
          return (
            <div key={f.id} style={{
              position: "absolute", left: x - 40, top: y - 40, zIndex: 100,
              color: "#E8F54A", fontWeight: 900, fontSize: 20,
              textShadow: "0 0 20px rgba(232,245,74,0.9)",
              animation: "floatUp 2s ease-out forwards",
              pointerEvents: "none",
            }}>+${f.amount.toFixed(2)}</div>
          );
        })}

        {/* Clickable grid cells */}
        {visibleSlots.map((slotNum) => {
          const slotX = slotToX(slotNum);
          const isBettable = slotNum >= firstBettableSlot;

          return visiblePriceLevels.map((priceLevel) => {
            const y = toY(priceLevel);
            const hasBet = getBetAtCell(slotNum, priceLevel);
            const distFromCenter = (currentPriceLevel - priceLevel) / PSTEP;
            const mult = calcMult(distFromCenter, Math.max(0, slotNum - currentSlot));

            return (
              <div
                key={`${slotNum}-${priceLevel}`}
                onClick={(e) => { e.stopPropagation(); if (!hasBet && isBettable) placeBet(slotNum, priceLevel); }}
                style={{
                  position: "absolute",
                  left: slotX,
                  top: y - cellSize / 2,
                  width: cellSize,
                  height: cellSize,
                  zIndex: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: hasBet || !isBettable ? "grab" : "pointer",
                  background: "transparent",
                  opacity: isBettable ? 1 : 0.3,
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={e => { if (!hasBet && isBettable && !isDragging.current) e.currentTarget.style.background = "rgba(232,245,74,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
              >
                {!hasBet && isBettable && (
                  <span style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.15)",
                    fontWeight: 500,
                  }}>{mult.toFixed(1)}x</span>
                )}
              </div>
            );
          });
        })}

        {/* Y-axis */}
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 30, width: 75, zIndex: 30, pointerEvents: "none" }}>
          {visiblePriceLevels.map((p) => {
            const y = toY(p);
            const isCurrent = p === currentPriceLevel;
            return (
              <div key={p} style={{
                position: "absolute",
                right: 8,
                top: y,
                transform: "translateY(-50%)",
                fontSize: 10,
                textAlign: "right",
                fontWeight: isCurrent ? 800 : 500,
                color: isCurrent ? "#E91E8C" : "rgba(233,30,140,0.35)",
              }}>
                {isCurrent ? (
                  <div style={{ background: "#E91E8C", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: "#fff", boxShadow: "0 0 16px rgba(233,30,140,0.5)" }}>${p.toFixed(0)}</div>
                ) : `$${p.toFixed(0)}`}
              </div>
            );
          })}
        </div>

        {/* X-axis */}
        <div style={{ position: "absolute", left: 0, right: 80, bottom: 0, height: 28, zIndex: 30, pointerEvents: "none" }}>
          {visibleSlots.map((slotNum) => {
            const x = slotToX(slotNum) + cellSize / 2;
            const isBettable = slotNum >= firstBettableSlot;
            const isCurrent = slotNum === currentSlot;
            return (
              <div key={slotNum} style={{
                position: "absolute",
                left: x,
                transform: "translateX(-50%)",
                fontSize: 8,
                color: isCurrent ? "#E91E8C" : isBettable ? "rgba(233,30,140,0.4)" : "rgba(233,30,140,0.2)",
                fontWeight: isCurrent ? 800 : 600,
              }}>
                {getSlotTimeLabel(slotNum)}
              </div>
            );
          })}
        </div>

        {showSMA && (
          <div style={{ position: "absolute", top: 8, left: 12, zIndex: 30, display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "rgba(100,200,255,0.6)", fontWeight: 600, pointerEvents: "none" }}>
            <div style={{ width: 16, height: 2, background: "rgba(100,200,255,0.5)", borderRadius: 1 }} /> SMA(12)
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "linear-gradient(transparent, rgba(13,8,21,0.97) 40%)" }}>
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: "7px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15 }}>💰</span>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.5, color: balance < 50 ? "#ff6b6b" : "#fff" }}>${balance.toFixed(2)}</span>
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
              cursor: "pointer", fontFamily: "inherit",
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
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-50px); } }
        @keyframes explode { 0% { transform: scale(0.3); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
        body { margin: 0; padding: 0; background: #0D0815; overflow: hidden; }
      `}</style>
    </div>
  );
}
