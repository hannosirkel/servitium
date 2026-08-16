import { useEffect, useMemo, useRef, useState } from 'react';
import FullscreenButton from '../shared/FullscreenButton';
import { GAME_CATALOGUE } from './catalogue';
import { freeSlots, tileAt } from './mahjong/engine';
import { getLayout, layoutsFor, type Difficulty } from './mahjong/layouts';
import {
  clearGame, dailySeed, DEFAULT_SETTINGS, EMPTY_STATS, loadSettings, loadStats, localDate,
  recordCompletion, restoreGame, saveGame, saveSettings, saveStats, type Settings, type Statistics,
} from './mahjong/persistence';
import { hashSeed } from './mahjong/random';
import {
  availablePairs, createGame, hint, restart, selectTile, shuffleGame, undo, type MahjongGame,
} from './mahjong/state';

type Route = 'shelf' | 'mahjong';
type DialogName = 'help' | 'settings' | 'statistics' | null;
const routeFromPath = (): Route => location.pathname.replace(/\/$/, '') === '/ludus/mahjong' ? 'mahjong' : 'shelf';
const formatTime = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function Header({ route, onBack }: { route: Route; onBack?: () => void }) {
  return <header className="ludus-header">
    <a className="brand" href="/" aria-label="Servitium home"><span className="brand-mark">S</span><span><b>SERVITIUM</b><small>LUDUS</small></span></a>
    <div className="header-actions">{route === 'mahjong' && <button className="text-button" onClick={onBack}>← Ludus</button>}<FullscreenButton compact /></div>
  </header>;
}

function Shelf({ openGame }: { openGame: () => void }) {
  return <main className="ludus-shell shelf-page">
    <Header route="shelf" />
    <section className="shelf-intro"><span className="eyebrow">GAMES FOR A QUIET TABLE</span><h1>Ludus</h1><p>Small games, ready when you are.</p></section>
    <section className="game-shelf" aria-label="Games">
      {GAME_CATALOGUE.map((game) => <article className="game-card" key={game.id}>
        <div className="game-art" aria-hidden="true"><span>{game.mark}</span><i /><i /><i /></div>
        <div><span className="status">AVAILABLE</span><h2>{game.title}</h2><p>{game.description}</p>
          <button className="primary" onClick={openGame}>Play now <span aria-hidden="true">→</span></button></div>
      </article>)}
    </section>
    <p className="shelf-note">More games can join the shelf later.</p>
  </main>;
}

const difficultyCopy: Record<Difficulty, { title: string; detail: string }> = {
  easy: { title: 'Easy', detail: '80 tiles · open, shallow layouts for learning.' },
  medium: { title: 'Medium', detail: '144 tiles · the full classic experience.' },
  hard: { title: 'Hard', detail: '144 tiles · deeper stacks and tighter choices.' },
};

function StartScreen({ saved, onContinue, onStart, onDaily, onBack, openDialog }: {
  saved: MahjongGame | null; onContinue: () => void; onStart: (difficulty: Difficulty, layoutId: string) => void;
  onDaily: () => void; onBack: () => void; openDialog: (dialog: Exclude<DialogName, null>) => void;
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [layoutId, setLayoutId] = useState(layoutsFor('easy')[0].id);
  const choose = (next: Difficulty) => { setDifficulty(next); setLayoutId(layoutsFor(next)[0].id); };
  return <main className="ludus-shell start-page"><Header route="mahjong" onBack={onBack} />
    <section className="start-panel"><span className="eyebrow">MAHJONG SOLITAIRE</span><h1>Clear the quiet table</h1>
      <p className="lede">Match two free tiles. A tile is free when nothing covers it and at least one side is open.</p>
      {saved && <button className="continue-card" onClick={onContinue}><span><b>Continue {difficultyCopy[saved.difficulty].title}</b><small>{getLayout(saved.layoutId).name} · {saved.remaining.length / 2} pairs remain</small></span><strong>Continue →</strong></button>}
      <fieldset className="difficulty-grid"><legend>New board</legend>{(['easy', 'medium', 'hard'] as Difficulty[]).map((item) =>
        <button key={item} aria-pressed={difficulty === item} className={difficulty === item ? 'selected' : ''} onClick={() => choose(item)}>
          <b>{difficultyCopy[item].title}</b><small>{difficultyCopy[item].detail}</small></button>)}</fieldset>
      <label className="layout-picker">Layout<select value={layoutId} onChange={(event) => setLayoutId(event.target.value)}>
        {layoutsFor(difficulty).map((layout) => <option key={layout.id} value={layout.id}>{layout.name}</option>)}</select></label>
      <div className="start-actions"><button className="primary" onClick={() => onStart(difficulty, layoutId)}>Start {difficultyCopy[difficulty].title}</button>
        <button onClick={onDaily}>Daily puzzle <small>{localDate()}</small></button></div>
      <nav className="quiet-actions"><button onClick={() => openDialog('help')}>How to play</button><button onClick={() => openDialog('settings')}>Settings</button><button onClick={() => openDialog('statistics')}>Statistics</button></nav>
    </section>
  </main>;
}

function Board({ game, settings, zoom, hintPair, onTile, onZoom, tileRefs }: {
  game: MahjongGame; settings: Settings; zoom: number; hintPair: string[]; onTile: (id: string) => void;
  onZoom: (zoom: number) => void;
  tileRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number; contentX: number; contentY: number } | null>(null);
  const suppressClick = useRef(false);
  const layout = getLayout(game.layoutId); const occupied = new Set(game.remaining);
  const free = new Set(freeSlots(layout, occupied).map((slot) => slot.id));
  const maxX = Math.max(...layout.slots.map((slot) => slot.x)) + 2; const maxY = Math.max(...layout.slots.map((slot) => slot.y)) + 2;
  const unitX = 31 * zoom; const unitY = 38 * zoom; const layer = 5 * zoom;
  const beginPinch = () => {
    const viewport = viewportRef.current; const points = [...pointers.current.values()];
    if (!viewport || points.length !== 2) return;
    const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    pinch.current = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), zoom,
      contentX: (viewport.scrollLeft + midpoint.x) / zoom, contentY: (viewport.scrollTop + midpoint.y) / zoom };
  };
  const pointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* synthetic or already-cancelled pointer */ }
    if (pointers.current.size === 2) beginPinch();
  };
  const pointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = [...pointers.current.values()]; const active = pinch.current; const viewport = viewportRef.current;
    if (!active || points.length !== 2 || !viewport || active.distance === 0) return;
    event.preventDefault(); suppressClick.current = true;
    const midpoint = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
    const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
    const next = Math.min(1.5, Math.max(.55, active.zoom * distance / active.distance));
    onZoom(next);
    requestAnimationFrame(() => {
      viewport.scrollLeft = active.contentX * next - midpoint.x;
      viewport.scrollTop = active.contentY * next - midpoint.y;
    });
  };
  const pointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId); pinch.current = null;
    if (pointers.current.size === 2) beginPinch();
    setTimeout(() => { suppressClick.current = false; }, 0);
  };
  return <div ref={viewportRef} className="board-viewport" data-autofit={settings.autoFit}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
    onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); } }}>
    <div className="board" role="group" aria-label={`${getLayout(game.layoutId).name} Mahjong board`}
    style={{ width: maxX * unitX + 80 * zoom, height: maxY * unitY + 90 * zoom }}>
    {layout.slots.filter((slot) => occupied.has(slot.id)).sort((a, b) => a.z - b.z).map((slot) => {
      const tile = tileAt(game.assignment, slot.id); const isFree = free.has(slot.id); const selected = game.selectedId === slot.id; const hinted = hintPair.includes(slot.id);
      const label = `${tile.label}, ${isFree ? 'free' : 'blocked'}`;
      return <button key={slot.id} ref={(element) => { tileRefs.current[slot.id] = element; }} type="button"
        data-slot-id={slot.id}
        className={`mahjong-tile family-${tile.family}${isFree && settings.highlightFree ? ' free' : ''}${selected ? ' selected' : ''}${hinted ? ' hinted' : ''}`}
        style={{ left: slot.x * unitX + slot.z * layer, top: slot.y * unitY - slot.z * layer, width: 60 * zoom, height: 74 * zoom, zIndex: slot.z * 100 + Math.round(slot.y) }}
        aria-label={label} disabled={!isFree} tabIndex={isFree ? 0 : -1} onClick={() => onTile(slot.id)}>
        <span className="tile-face"><strong>{settings.tileStyle === 'clear' ? clearFace(tile.id) : tile.face}</strong><small>{settings.tileStyle === 'clear' ? clearSuit(tile.id) : tile.family}</small></span>
      </button>;
    })}
  </div></div>;
}

function clearFace(id: string): string { const part = id.split('-')[1]; return /^\d+$/.test(part) ? part : part.slice(0, 1).toUpperCase(); }
function clearSuit(id: string): string { return id.split('-')[0].toUpperCase(); }

function GameScreen({ game, setGame, settings, onNew, onBack, openDialog, onComplete }: {
  game: MahjongGame; setGame: (game: MahjongGame) => void; settings: Settings; onNew: () => void; onBack: () => void;
  openDialog: (dialog: Exclude<DialogName, null>) => void; onComplete: (game: MahjongGame) => void;
}) {
  const [zoom, setZoom] = useState(settings.autoFit ? .72 : 1); const [hintPair, setHintPair] = useState<string[]>([]); const [announcement, setAnnouncement] = useState('');
  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pairs = availablePairs(game); const deadEnd = game.remaining.length > 0 && pairs.length === 0;
  const act = (id: string) => {
    const result = selectTile(game, id); setGame(result.game);
    const messages = { selected: `${tileAt(game.assignment, id).label} selected`, mismatch: 'Tiles do not match', blocked: 'That tile is blocked', removed: `Pair removed. ${result.game.remaining.length / 2} pairs remain`, won: 'Board cleared' };
    setAnnouncement(messages[result.event]);
    if (result.event === 'removed' || result.event === 'won') {
      if (settings.sound) playTone(520, .035); setHintPair([]);
      requestAnimationFrame(() => Object.values(tileRefs.current).find((element) => element && !element.disabled && element.tabIndex === 0)?.focus());
    }
    if (result.event === 'won') onComplete(result.game);
  };
  const doHint = () => { const result = hint(game); setGame(result.game); setHintPair(result.pair ?? []); setAnnouncement(result.pair ? 'A matching pair is highlighted' : 'No free matches'); };
  const doShuffle = () => { if (!deadEnd && !confirm('Shuffle while moves remain? This changes the puzzle.')) return; setGame(shuffleGame(game)); setHintPair([]); setAnnouncement('Remaining tiles shuffled'); };
  const doRestart = () => { if (game.pairsRemoved && !confirm('Restart this exact board?')) return; setGame(restart(game)); setHintPair([]); };
  return <main className="game-page"><Header route="mahjong" onBack={onBack} />
    <section className="game-hud"><div><span>{difficultyCopy[game.difficulty].title}</span><b>{getLayout(game.layoutId).name}</b></div>
      <div><span>Remaining</span><b>{game.remaining.length / 2} pairs</b></div>{settings.showTimer && <div><span>Active time</span><b>{formatTime(game.elapsedMs)}</b></div>}</section>
    {deadEnd && <div className="no-moves" role="status"><b>No free matches</b><span>Your board is safe. Undo or reshuffle the remaining tiles.</span><button onClick={() => setGame(undo(game))} disabled={!game.history.length}>Undo</button><button onClick={doShuffle}>Shuffle</button></div>}
    <Board game={game} settings={settings} zoom={zoom} hintPair={hintPair} onTile={act} onZoom={setZoom} tileRefs={tileRefs} />
    <nav className="game-controls" aria-label="Mahjong controls">
      <button onClick={() => setGame(undo(game))} disabled={!game.history.length} aria-label="Undo"><span>↶</span><small>Undo</small></button>
      <button onClick={doHint} disabled={!pairs.length} aria-label="Hint"><span>◇</span><small>Hint</small></button>
      <button onClick={doShuffle} aria-label="Shuffle"><span>⤨</span><small>Shuffle</small></button>
      <button onClick={() => openDialog('help')} aria-label="Help"><span>?</span><small>Help</small></button>
      <button onClick={() => openDialog('settings')} aria-label="Settings"><span>⚙</span><small>Settings</small></button>
      <button onClick={doRestart} aria-label="Restart"><span>↺</span><small>Restart</small></button>
      <button onClick={onNew} aria-label="New game"><span>＋</span><small>New</small></button>
    </nav>
    <div className="zoom-controls" aria-label="Board zoom"><button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(.55, value - .1))}>−</button><button aria-label="Fit board" onClick={() => setZoom(.72)}>Fit</button><button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.5, value + .1))}>＋</button></div>
    <div className="sr-only" aria-live="polite">{announcement}</div>
  </main>;
}

function Completion({ game, stats, onNew, onReplay, onBack }: { game: MahjongGame; stats: Statistics; onNew: () => void; onReplay: () => void; onBack: () => void }) {
  const clean = Object.values(game.assistance).every((count) => count === 0); const best = stats.layouts[game.layoutId]?.bestMs;
  return <main className="ludus-shell completion-page"><Header route="mahjong" onBack={onBack} /><section className="completion-card">
    <div className="completion-mark" aria-hidden="true">◇</div><span className="eyebrow">BOARD CLEARED</span><h1>{clean ? 'A clean solve' : 'The table is clear'}</h1>
    <p>{getLayout(game.layoutId).name} · {difficultyCopy[game.difficulty].title}</p><dl><div><dt>Active time</dt><dd>{formatTime(game.elapsedMs)}</dd></div><div><dt>Pairs removed</dt><dd>{game.pairsRemoved}</dd></div>
      <div><dt>Hint / Undo / Shuffle</dt><dd>{game.assistance.hints} / {game.assistance.undos} / {game.assistance.shuffles}</dd></div><div><dt>Personal best</dt><dd>{best === null || best === undefined ? '—' : formatTime(best)}</dd></div></dl>
    <div className="completion-actions"><button className="primary" onClick={onNew}>New board</button><button onClick={onReplay}>Replay this board</button><button onClick={onBack}>Back to Ludus</button></div>
  </section></main>;
}

function Dialogs({ dialog, close, settings, setSettings, stats }: { dialog: DialogName; close: () => void; settings: Settings; setSettings: (settings: Settings) => void; stats: Statistics }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (dialog && !ref.current?.open) ref.current?.showModal(); if (!dialog && ref.current?.open) ref.current.close(); }, [dialog]);
  const toggle = (key: keyof Settings) => setSettings({ ...settings, [key]: !settings[key] });
  return <dialog ref={ref} className="ludus-dialog" onClose={close}><button className="dialog-close" aria-label="Close dialog" onClick={close}>×</button>
    {dialog === 'help' && <><span className="eyebrow">HOW TO PLAY</span><h2>Match free tiles</h2><p>Mahjong Solitaire is a single-player matching game, not traditional four-player Mahjong.</p>
      <div className="rule-visual" aria-label="A free tile has an uncovered top and one open side"><span>blocked</span><b>FREE</b><i>covered</i></div>
      <ul><li>A tile needs an uncovered top and at least one open horizontal side.</li><li>Exact faces match. Any Flower matches another Flower; any Season matches another Season.</li><li>Easy boards use a pair-complete 80-tile set for larger tiles and shorter sessions. Medium and Hard use all 144 tiles.</li><li>A deal begins solvable, but a careless choice can still create a dead end.</li></ul></>}
    {dialog === 'settings' && <><span className="eyebrow">PREFERENCES</span><h2>Settings</h2><fieldset className="style-choice"><legend>Tile style</legend>{(['traditional', 'clear'] as const).map((style) => <button key={style} aria-pressed={settings.tileStyle === style} onClick={() => setSettings({ ...settings, tileStyle: style })}>{style[0].toUpperCase() + style.slice(1)}</button>)}</fieldset>
      {([['highlightFree', 'Highlight free tiles'], ['showTimer', 'Show timer'], ['sound', 'Sound effects'], ['autoFit', 'Auto-fit board']] as [keyof Settings, string][]).map(([key, label]) => <label className="switch" key={key}><span>{label}</span><input type="checkbox" checked={Boolean(settings[key])} onChange={() => toggle(key)} /></label>)}</>}
    {dialog === 'statistics' && <><span className="eyebrow">ON THIS DEVICE</span><h2>Statistics</h2><dl className="stats-list">{(['easy', 'medium', 'hard'] as Difficulty[]).map((item) => <div key={item}><dt>{difficultyCopy[item].title} completions</dt><dd>{stats.completed[item]}</dd></div>)}<div><dt>Daily streak</dt><dd>{stats.dailyStreak}</dd></div><div><dt>Daily puzzles completed</dt><dd>{stats.dailyDates.length}</dd></div></dl></>}
  </dialog>;
}

function playTone(frequency: number, duration: number) { try { const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.frequency.value = frequency; gain.gain.value = .025; oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration); oscillator.addEventListener('ended', () => void context.close()); } catch { /* optional enhancement */ } }

export default function App() {
  const [route, setRoute] = useState<Route>(routeFromPath); const [saved, setSaved] = useState<MahjongGame | null>(() => restoreGame(localStorage));
  const [game, setGameState] = useState<MahjongGame | null>(null); const [completed, setCompleted] = useState<MahjongGame | null>(null);
  const [settings, setSettingsState] = useState(() => loadSettings(localStorage)); const [stats, setStats] = useState(() => loadStats(localStorage)); const [dialog, setDialog] = useState<DialogName>(null);
  const navigate = (next: Route) => { const path = next === 'shelf' ? '/ludus/' : '/ludus/mahjong'; history.pushState({}, '', path); setRoute(next); setGameState(null); setCompleted(null); };
  useEffect(() => { const pop = () => { setRoute(routeFromPath()); setGameState(null); setCompleted(null); }; addEventListener('popstate', pop); return () => removeEventListener('popstate', pop); }, []);
  useEffect(() => { saveSettings(localStorage, settings); }, [settings]);
  useEffect(() => { if (game) { saveGame(localStorage, game); setSaved(game); } }, [game]);
  useEffect(() => {
    if (!game || game.completedAt) return; const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setGameState((current) => current ? { ...current, elapsedMs: current.elapsedMs + 1000, lastActiveAt: Date.now() } : current);
    }, 1000); return () => clearInterval(timer);
  }, [Boolean(game), game?.completedAt]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (game && game.pairsRemoved && !game.completedAt) event.preventDefault(); }; addEventListener('beforeunload', warn); return () => removeEventListener('beforeunload', warn); }, [game]);
  const updateSettings = (next: Settings) => setSettingsState(next);
  const start = (difficulty: Difficulty, layoutId: string, kind: 'standard' | 'daily' = 'standard', seed?: string) => {
    if (!game && saved?.pairsRemoved && !saved.completedAt && !confirm('Replace the saved game with a new board?')) return;
    const next = createGame(difficulty, layoutId, seed ?? crypto.randomUUID(), kind); setGameState(next); setCompleted(null);
  };
  const daily = () => { const seed = dailySeed(); const layouts = layoutsFor('medium'); start('medium', layouts[hashSeed(seed) % layouts.length].id, 'daily', seed); };
  const abandon = () => { if (game?.pairsRemoved && !game.completedAt && !confirm('Leave this game and choose a new board?')) return; setGameState(null); setCompleted(null); };
  const back = () => { if (game?.pairsRemoved && !game.completedAt && !confirm('Leave the board? Your progress will remain saved.')) return; navigate('shelf'); };
  const finish = (won: MahjongGame) => { const finalStats = recordCompletion(stats, won); setStats(finalStats); saveStats(localStorage, finalStats); clearGame(localStorage); setSaved(null); setCompleted(won); setGameState(null); };
  const replay = () => completed && start(completed.difficulty, completed.layoutId, completed.kind, completed.seed);
  const content = useMemo(() => {
    if (route === 'shelf') return <Shelf openGame={() => navigate('mahjong')} />;
    if (completed) return <Completion game={completed} stats={stats} onNew={() => setCompleted(null)} onReplay={replay} onBack={() => navigate('shelf')} />;
    if (game) return <GameScreen game={game} setGame={setGameState} settings={settings} onNew={abandon} onBack={back} openDialog={setDialog} onComplete={finish} />;
    return <StartScreen saved={saved} onContinue={() => setGameState(saved)} onStart={start} onDaily={daily} onBack={() => navigate('shelf')} openDialog={setDialog} />;
  }, [route, game, completed, saved, settings, stats]);
  return <>{content}<Dialogs dialog={dialog} close={() => setDialog(null)} settings={settings} setSettings={updateSettings} stats={stats ?? EMPTY_STATS} /></>;
}
