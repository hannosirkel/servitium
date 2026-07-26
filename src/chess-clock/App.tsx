import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FullscreenButton from '../shared/FullscreenButton';
import {
  PRESETS, STORAGE_KEY, currentRemaining, formatClock, initialState, pauseClock,
  restoreGame, startClock, switchTurn, type BonusMode, type ClockConfig,
  type ClockState, type Player,
} from './logic';

const names = ['White', 'Black'];

export default function App() {
  const restored = useMemo(() => restoreGame(localStorage), []);
  const [config, setConfig] = useState<ClockConfig>(restored?.config ?? PRESETS[1].config);
  const [clock, setClock] = useState<ClockState>(restored?.state ?? initialState(PRESETS[1].config));
  const [preset, setPreset] = useState(restored ? 'custom' : 'blitz');
  const [differentTimes, setDifferentTimes] = useState(() => config.minutes[0] !== config.minutes[1]);
  const [showSettings, setShowSettings] = useState(() => !restored);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!clock.running) return;
    const tick = () => setNow(Date.now());
    tick();
    tickRef.current = window.setInterval(tick, 100);
    return () => { if (tickRef.current !== null) clearInterval(tickRef.current); };
  }, [clock.running]);

  useEffect(() => {
    if (!clock.running || clock.activePlayer === null) return;
    if (currentRemaining(clock, config, now)[clock.activePlayer] <= 0) {
      setClock((value) => pauseClock(value, config, Date.now()));
      navigator.vibrate?.([180, 80, 180]);
    }
  }, [clock, config, now]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, state: clock }));
  }, [clock, config]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (clock.running) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [clock.running]);

  const displayed = currentRemaining(clock, config, now);
  const choosePreset = (id: string) => {
    const choice = PRESETS.find((item) => item.id === id);
    if (!choice) return;
    setPreset(id); setConfig(choice.config); setDifferentTimes(false); setClock(initialState(choice.config));
  };
  const updateConfig = (next: ClockConfig) => {
    setPreset('custom'); setConfig(next); setClock(initialState(next));
  };
  const tapPlayer = useCallback((player: Player) => {
    const timestamp = Date.now();
    setNow(timestamp);
    setClock((value) => {
      if (value.flaggedPlayer !== null) return value;
      if (!value.running) {
        if (value.activePlayer === null) return startClock(value, player === 0 ? 1 : 0, timestamp);
        return startClock(value, value.activePlayer, timestamp);
      }
      if (value.activePlayer !== player) return value;
      navigator.vibrate?.(18);
      return switchTurn(value, config, timestamp);
    });
    setShowSettings(false);
  }, [config]);
  const reset = () => {
    if ((clock.activePlayer !== null || clock.moveCount > 0) && !window.confirm('Reset the current game? This cannot be undone.')) return;
    const next = initialState(config);
    setClock(next); setNow(Date.now()); localStorage.removeItem(STORAGE_KEY); setShowSettings(true);
  };

  return (
    <main className="clock-shell">
      <div className="ambient" aria-hidden="true" />
      <header className="masthead">
        <a className="brand" href="/" aria-label="Servitium home"><span className="brand-mark">S</span><span><b>SERVITIUM</b><small>THE CHESS CLOCK</small></span></a>
        <div className="header-actions">
          <FullscreenButton />
          <button onClick={() => setShowSettings((value) => !value)} disabled={clock.running}>Settings</button>
          <button onClick={reset}>Reset</button>
        </div>
      </header>

      {showSettings && !clock.running && (
        <section className="settings" aria-labelledby="settings-title">
          <div><span className="eyebrow">TIME CONTROL</span><h1 id="settings-title">Set the pace</h1></div>
          <div className="presets" role="group" aria-label="Time control presets">
            {PRESETS.map((item) => <button key={item.id} aria-pressed={preset === item.id} onClick={() => choosePreset(item.id)}><b>{item.label}</b><span>{item.detail}</span></button>)}
            <button aria-pressed={preset === 'custom'} onClick={() => setPreset('custom')}><b>Custom</b><span>Choose</span></button>
          </div>
          {preset === 'custom' && (
            <div className="custom-settings">
              <label>White minutes<input aria-label="White minutes" type="number" min="1" max="300" value={config.minutes[0]} onChange={(event) => {
                const value = Math.max(1, Math.min(300, Number(event.target.value)));
                updateConfig({ ...config, minutes: [value, differentTimes ? config.minutes[1] : value] });
              }} /></label>
              {differentTimes && <label>Black minutes<input aria-label="Black minutes" type="number" min="1" max="300" value={config.minutes[1]} onChange={(event) => updateConfig({ ...config, minutes: [config.minutes[0], Math.max(1, Math.min(300, Number(event.target.value)))] })} /></label>}
              <label>Timing<select aria-label="Timing mode" value={config.bonusMode} onChange={(event) => updateConfig({ ...config, bonusMode: event.target.value as BonusMode, bonusSeconds: event.target.value === 'none' ? 0 : Math.max(1, config.bonusSeconds) })}><option value="none">No bonus</option><option value="increment">Increment</option><option value="delay">Delay</option></select></label>
              {config.bonusMode !== 'none' && <label>Seconds<input aria-label="Bonus seconds" type="number" min="1" max="60" value={config.bonusSeconds} onChange={(event) => updateConfig({ ...config, bonusSeconds: Math.max(1, Math.min(60, Number(event.target.value))) })} /></label>}
              <label className="check"><input type="checkbox" checked={differentTimes} onChange={(event) => { setDifferentTimes(event.target.checked); if (!event.target.checked) updateConfig({ ...config, minutes: [config.minutes[0], config.minutes[0]] }); }} /> Different player times</label>
            </div>
          )}
          <p className="setup-hint">Tap the player who completes the first move. Their opponent’s clock starts.</p>
        </section>
      )}

      <section className={`clock-board ${showSettings ? 'with-settings' : ''}`} aria-label="Chess clock">
        {([0, 1] as Player[]).map((player) => {
          const active = clock.running && clock.activePlayer === player;
          const flagged = clock.flaggedPlayer === player;
          return <button key={player} className={`player-clock player-${player} ${active ? 'active' : ''} ${flagged ? 'flagged' : ''}`} onClick={() => tapPlayer(player)} disabled={clock.running && clock.activePlayer !== player} aria-label={`${names[player]} clock, ${formatClock(displayed[player])}${active ? ', running' : ''}`}>
            <span className="player-name"><i aria-hidden="true">{player === 0 ? '♔' : '♚'}</i>{names[player]}</span>
            <time>{formatClock(displayed[player])}</time>
            <small>{flagged ? 'TIME' : active ? 'YOUR MOVE · TAP WHEN DONE' : clock.activePlayer === null ? 'TAP AFTER FIRST MOVE' : 'WAITING'}</small>
          </button>;
        })}
      </section>

      <footer className="clock-controls">
        <span>{config.minutes[0]}{differentTimes ? ` / ${config.minutes[1]}` : ''} min · {config.bonusMode === 'none' ? 'no bonus' : `${config.bonusSeconds}s ${config.bonusMode}`}</span>
        <span>{clock.moveCount} moves</span>
        {clock.activePlayer !== null && clock.flaggedPlayer === null && <button onClick={() => {
          const timestamp = Date.now(); setNow(timestamp);
          setClock((value) => value.running ? pauseClock(value, config, timestamp) : startClock(value, value.activePlayer!, timestamp));
        }}>{clock.running ? 'Pause' : 'Resume'}</button>}
      </footer>
      <div className="sr-only" aria-live="assertive">{clock.flaggedPlayer === null ? '' : `${names[clock.flaggedPlayer]} is out of time`}</div>
    </main>
  );
}
