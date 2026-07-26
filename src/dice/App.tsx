import { useCallback, useEffect, useRef, useState } from 'react';
import type DiceBox from '@3d-dice/dice-box';
import FullscreenButton from '../shared/FullscreenButton';
import {
  DICE_TYPES, addHistory, clampCount, clearHistory, formatTime, isFlick,
  makeRecord, motionMagnitude, persistHistory, randomValues, restoreHistory,
  shouldShakeRoll, type DieType, type Point, type ThrowRecord,
} from './logic';

type MotionPermission = 'not-needed' | 'prompt' | 'granted' | 'denied' | 'dismissed';
type DeviceMotionWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>;
};

const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia(reducedMotionQuery).matches);
  useEffect(() => {
    const query = matchMedia(reducedMotionQuery);
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

export default function App() {
  const [die, setDie] = useState<DieType>(20);
  const [count, setCount] = useState(2);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<ThrowRecord | null>(null);
  const [history, setHistory] = useState<ThrowRecord[]>(() => restoreHistory(localStorage));
  const [isMobile, setIsMobile] = useState(() => matchMedia('(max-width: 720px), (pointer: coarse)').matches);
  const [webglReady, setWebglReady] = useState(false);
  const [motionPermission, setMotionPermission] = useState<MotionPermission>(() => {
    const motion = window.DeviceMotionEvent as DeviceMotionWithPermission | undefined;
    return typeof motion?.requestPermission === 'function' ? 'prompt' : 'not-needed';
  });
  const reducedMotion = useReducedMotion();
  const diceBox = useRef<DiceBox | null>(null);
  const pointerStart = useRef<Point | null>(null);
  const lastShake = useRef(0);
  const rollingRef = useRef(false);

  useEffect(() => {
    const query = matchMedia('(max-width: 720px), (pointer: coarse)');
    const update = () => setIsMobile(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    let active = true;
    import('@3d-dice/dice-box').then(async ({ default: Box }) => {
      try {
        const box = new Box('#dice-canvas', {
          assetPath: '/dice/dice-box/',
          theme: 'default',
          themeColor: '#e7a93c',
          scale: 5.6,
          gravity: 1.8,
          mass: 1.25,
          friction: 0.72,
          restitution: 0.62,
          spinForce: 6,
          throwForce: 7,
        });
        await box.init();
        if (active) {
          diceBox.current = box;
          setWebglReady(true);
        }
      } catch {
        if (active) setWebglReady(false);
      }
    });
    return () => { active = false; };
  }, [reducedMotion]);

  const finishRoll = useCallback((values: number[]) => {
    const entry = makeRecord(die, count, values);
    setResult(entry);
    setHistory((current) => {
      const next = addHistory(current, entry);
      persistHistory(localStorage, next);
      return next;
    });
    rollingRef.current = false;
    setRolling(false);
    navigator.vibrate?.([24, 28, 42]);
  }, [count, die]);

  const roll = useCallback(async () => {
    if (rollingRef.current) return;
    rollingRef.current = true;
    setRolling(true);
    setResult(null);
    const fallback = randomValues(die, count);
    try {
      if (!reducedMotion && diceBox.current) {
        diceBox.current.clear();
        const diceResults = await diceBox.current.roll(`${count}d${die}`);
        finishRoll(diceResults.map((item) => Number(item.value)));
      } else {
        window.setTimeout(() => finishRoll(fallback), reducedMotion ? 360 : 760);
      }
    } catch {
      window.setTimeout(() => finishRoll(fallback), reducedMotion ? 200 : 500);
    }
  }, [count, die, finishRoll, reducedMotion]);

  useEffect(() => {
    const handleMotion = (event: DeviceMotionEvent) => {
      const now = Date.now();
      if (shouldShakeRoll(motionMagnitude(event), now, lastShake.current, rollingRef.current)) {
        lastShake.current = now;
        void roll();
      }
    };
    if (motionPermission === 'not-needed' || motionPermission === 'granted') {
      window.addEventListener('devicemotion', handleMotion);
      return () => window.removeEventListener('devicemotion', handleMotion);
    }
  }, [motionPermission, roll]);

  const requestMotion = async () => {
    try {
      const motion = window.DeviceMotionEvent as DeviceMotionWithPermission | undefined;
      const permission = await motion?.requestPermission?.();
      setMotionPermission(permission === 'granted' ? 'granted' : 'denied');
    } catch {
      setMotionPermission('denied');
    }
  };

  const pointerDown = (event: React.PointerEvent) => {
    pointerStart.current = { x: event.clientX, y: event.clientY, time: performance.now() };
  };
  const pointerUp = (event: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const end = { x: event.clientX, y: event.clientY, time: performance.now() };
    const wasFlick = isFlick(pointerStart.current, end);
    pointerStart.current = null;
    if (wasFlick) void roll();
  };

  const chooseDie = (value: DieType) => {
    if (!rolling) setDie(value);
  };

  return (
    <main className="app-shell">
      <div className="ambient" aria-hidden="true" />
      <header className="masthead">
        <a className="brand" href="/" aria-label="Servitium home">
          <span className="brand-mark">S</span>
          <span><b>SERVITIUM</b><small>THE DICE HALL</small></span>
        </a>
        <div className="module-actions">
          <p className="motto">Fortune favours the bold</p>
          <FullscreenButton />
        </div>
      </header>

      <div className="layout">
        <section className="play-area" aria-labelledby="dice-title">
          <div className="title-row">
            <div>
              <span className="eyebrow">THE ROYAL TABLE</span>
              <h1 id="dice-title">Cast your fate</h1>
            </div>
            <div className="selection-readout" aria-label={`Selected ${count}d${die}`}>
              <span>{count}</span><small>d{die}</small>
            </div>
          </div>

          <div
            className={`tray ${rolling ? 'is-rolling' : ''}`}
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            onPointerCancel={() => { pointerStart.current = null; }}
          >
            <div className="tray-corner top-left" aria-hidden="true" />
            <div className="tray-corner top-right" aria-hidden="true" />
            <div className="tray-corner bottom-left" aria-hidden="true" />
            <div className="tray-corner bottom-right" aria-hidden="true" />
            <div id="dice-canvas" className="dice-canvas" aria-hidden="true" />

            {!rolling && !result && (
              <button className="tray-prompt" onClick={() => void roll()} aria-label="Throw selected dice">
                <span className="prompt-die">✦</span>
                <b>{isMobile ? 'Flick or tap to throw' : 'Ready your throw'}</b>
                <small>{isMobile ? 'Shake also works when enabled' : 'Use the gilded sigil'}</small>
              </button>
            )}

            {rolling && (
              <div className="rolling-label" role="status">
                <span className="spark">✦</span> Casting…
              </div>
            )}

            {result && (
              <div className={`result-display ${webglReady && !reducedMotion ? 'over-canvas' : ''}`}>
                <div className="total-block">
                  <small>TOTAL</small>
                  <strong>{result.total}</strong>
                </div>
                <div className="individual-dice" aria-label={`Individual values: ${result.values.join(', ')}`}>
                  {result.values.map((value, index) => (
                    <span className="result-die" key={`${result.id}-${index}`}>{value}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="controls">
            <fieldset className="die-picker" disabled={rolling}>
              <legend>CHOOSE YOUR DIE</legend>
              <div>
                {DICE_TYPES.map((type) => (
                  <button
                    type="button"
                    className={die === type ? 'selected' : ''}
                    aria-pressed={die === type}
                    aria-label={`Select d${type}`}
                    onClick={() => chooseDie(type)}
                    key={type}
                  >
                    <span className={`die-shape d${type}`}>d{type}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="count-control">
              <span>NUMBER OF DICE</span>
              <div>
                <button onClick={() => setCount((value) => clampCount(value - 1))} disabled={rolling || count === 1} aria-label="Remove one die">−</button>
                <output aria-live="polite">{count}</output>
                <button onClick={() => setCount((value) => clampCount(value + 1))} disabled={rolling || count === 10} aria-label="Add one die">+</button>
              </div>
            </div>

            {!isMobile && (
              <button className="throw-sigil" onClick={() => void roll()} disabled={rolling} aria-label="Throw dice">
                <span className="sigil-ring"><span>↗</span></span>
                <small>{rolling ? 'CASTING' : 'THROW'}</small>
              </button>
            )}
            {isMobile && (
              <button className="mobile-throw" onClick={() => void roll()} disabled={rolling}>
                {rolling ? 'Casting…' : `Throw ${count}d${die}`}
              </button>
            )}
          </div>

          {isMobile && motionPermission === 'prompt' && (
            <aside className="motion-card">
              <span aria-hidden="true">⌁</span>
              <p><b>Shake to throw</b><small>Enable motion for a more physical cast.</small></p>
              <button onClick={() => void requestMotion()}>Enable shake</button>
              <button className="dismiss" onClick={() => setMotionPermission('dismissed')} aria-label="Dismiss shake onboarding">×</button>
            </aside>
          )}
          {isMobile && motionPermission === 'denied' && (
            <p className="motion-note">Motion unavailable — flicking and tapping still work.</p>
          )}
        </section>

        <aside className="history-panel" aria-labelledby="history-title">
          <div className="history-heading">
            <div><span className="eyebrow">THE CHRONICLE</span><h2 id="history-title">Recent throws</h2></div>
            {history.length > 0 && (
              <button onClick={() => { clearHistory(localStorage); setHistory([]); }} aria-label="Clear throw history">Clear</button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="empty-history"><span>◇</span><p>Your fortunes<br />will be recorded here.</p></div>
          ) : (
            <ol>
              {history.map((entry, index) => (
                <li key={entry.id}>
                  <span className="history-index">{String(index + 1).padStart(2, '0')}</span>
                  <div><b>{entry.count}d{entry.die}</b><small>{entry.values.join(' · ')}</small></div>
                  <strong>{entry.total}</strong>
                  <time dateTime={new Date(entry.timestamp).toISOString()}>{formatTime(entry.timestamp)}</time>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>
      <div className="sr-only" aria-live="assertive">
        {result ? `${result.count}d${result.die} rolled ${result.values.join(', ')}, total ${result.total}` : ''}
      </div>
    </main>
  );
}
