import { useEffect, useRef, useState } from 'react';
import FullscreenButton from '../shared/FullscreenButton';
import {
  PRESETS, STORAGE_KEY, adjustCommanderDamage, adjustCommanderTax, adjustLife, adjustPoison,
  createGame, persistGame, playerWarnings, poisonLimit, redo, rematch, restoreGame, setRole,
  undo, type FormatId, type GameSetup, type GameState, type PlayerState,
} from './logic';

type DialogName = 'counters' | 'history' | 'tools' | 'game' | null;
type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener: (name: string, fn: () => void) => void };

function Setup({ onStart }: { onStart: (setup: GameSetup) => void }) {
  const [format, setFormat] = useState<FormatId>('constructed');
  const preset = PRESETS.find((item) => item.id === format)!;
  const [count, setCount] = useState(preset.defaultPlayers);
  const [customLife, setCustomLife] = useState(20);
  const [names, setNames] = useState(['', '', '', '']);

  const chooseFormat = (value: FormatId) => {
    const next = PRESETS.find((item) => item.id === value)!;
    setFormat(value);
    setCount(next.defaultPlayers);
  };

  return (
    <main className="setup-shell">
      <div className="ambient" aria-hidden="true" />
      <header className="brand-header">
        <a className="brand" href="/" aria-label="Servitium home">
          <span className="brand-mark">S</span>
          <span><b>SERVITIUM</b><small>ARCANE LEDGER</small></span>
        </a>
        <FullscreenButton />
      </header>
      <section className="setup-card" aria-labelledby="setup-title">
        <span className="eyebrow">NEW TABLE</span>
        <h1 id="setup-title">Set the life totals</h1>
        <p className="lede">Fast at the table. Detailed only when you need it.</p>
        <fieldset className="format-grid">
          <legend>Format</legend>
          {PRESETS.map((item) => (
            <button
              key={item.id} type="button" className={format === item.id ? 'selected' : ''}
              aria-pressed={format === item.id} onClick={() => chooseFormat(item.id)}
            >
              <b>{item.label}</b><small>{item.detail}</small>
            </button>
          ))}
        </fieldset>
        {format !== 'two-headed-giant' && (
          <fieldset className="seat-picker">
            <legend>Players</legend>
            {[2, 3, 4].map((value) => (
              <button key={value} type="button" aria-pressed={count === value}
                className={count === value ? 'selected' : ''} onClick={() => setCount(value)}>{value}</button>
            ))}
          </fieldset>
        )}
        {format === 'custom' && (
          <label className="custom-life">Starting life
            <input aria-label="Custom starting life" type="number" min="1" max="999" value={customLife}
              onChange={(event) => setCustomLife(Number(event.target.value))} />
          </label>
        )}
        <div className="name-grid">
          {Array.from({ length: format === 'two-headed-giant' ? 2 : count }, (_, index) => (
            <label key={index}>{format === 'two-headed-giant' ? `Team ${index + 1}` : `Player ${index + 1}`}
              <input value={names[index]} maxLength={24} placeholder={format === 'two-headed-giant' ? `Team ${index + 1}` : `Player ${index + 1}`}
                onChange={(event) => setNames((current) => current.map((name, item) => item === index ? event.target.value : name))} />
            </label>
          ))}
        </div>
        <button className="primary" onClick={() => onStart({
          format, playerCount: count, startingLife: customLife, names,
        })}>Start game</button>
      </section>
    </main>
  );
}

function Stepper({ label, value, onMinus, onPlus }: {
  label: string; value: number; onMinus: () => void; onPlus: () => void;
}) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <button onClick={onMinus} aria-label={`Decrease ${label}`}>−</button>
      <output aria-label={`${label}: ${value}`}>{value}</output>
      <button onClick={onPlus} aria-label={`Increase ${label}`}>+</button>
    </div>
  );
}

function PlayerPanel({ game, player, position, onChange, onCounters }: {
  game: GameState;
  player: PlayerState;
  position: number;
  onChange: (amount: number) => void;
  onCounters: () => void;
}) {
  const warnings = playerWarnings(game, player);
  const commanderMax = Math.max(0, ...Object.values(player.commanderDamage));
  const isFar = game.players.length === 2 ? position === 0 : position < Math.ceil(game.players.length / 2);
  return (
    <section className={`player-panel theme-${player.theme} ${isFar ? 'far-side' : ''}`}
      aria-labelledby={`${player.id}-name`}>
      <div className="player-inner">
        <header>
          <button className="player-name" id={`${player.id}-name`} onClick={() => {}}>{player.name}</button>
          <div className="chips">
            {game.monarchId === player.id && <span>MONARCH</span>}
            {game.initiativeId === player.id && <span>INITIATIVE</span>}
          </div>
        </header>
        <div className={`life-total ${warnings.length ? 'warning' : ''}`} aria-live="polite">
          <small>LIFE</small><strong>{player.life}</strong>
        </div>
        <div className="life-controls" aria-label={`${player.name} life controls`}>
          {[-5, -1, 1, 5].map((amount) => (
            <button key={amount} onClick={() => onChange(amount)}
              aria-label={`${player.name} ${amount > 0 ? 'gain' : 'lose'} ${Math.abs(amount)} life`}>
              {amount > 0 ? '+' : '−'}{Math.abs(amount)}
            </button>
          ))}
        </div>
        <button className="counter-summary" aria-label={`${player.name} counters`} onClick={onCounters}>
          <span>☠ {player.poison}/{poisonLimit(game)}</span>
          {game.format === 'commander' && <span>CMD {commanderMax}/21</span>}
          <b>Counters</b>
        </button>
        {warnings.length > 0 && <p className="warning-text" role="status">{warnings.join(' · ')}</p>}
      </div>
    </section>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState | null>(() => restoreGame(localStorage));
  const [dialog, setDialog] = useState<DialogName>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [haptics, setHaptics] = useState(true);
  const [wakeActive, setWakeActive] = useState(false);
  const [utilityResult, setUtilityResult] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const wakeRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (game) persistGame(localStorage, game);
  }, [game]);

  useEffect(() => {
    const modal = dialogRef.current;
    if (dialog && modal && !modal.open) modal.showModal();
    if (!dialog && modal?.open) modal.close();
  }, [dialog]);

  useEffect(() => () => { void wakeRef.current?.release(); }, []);

  if (!game) return <Setup onStart={(setup) => setGame(createGame(setup))} />;

  const selected = game.players.find((player) => player.id === selectedId) ?? null;
  const apply = (next: GameState, message: string) => {
    if (next === game) return;
    setGame(next);
    setAnnouncement(message);
    if (haptics) navigator.vibrate?.(18);
  };
  const open = (name: DialogName, playerId?: string) => {
    setSelectedId(playerId ?? null);
    setDialog(name);
  };
  const newGame = () => {
    if (game.history.length && !confirm('Leave this game and start a new one?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setDialog(null);
    setGame(null);
  };
  const doRematch = () => {
    if (game.history.length && !confirm('Reset every total for a rematch?')) return;
    setGame(rematch(game));
    setDialog(null);
  };
  const toggleWake = async () => {
    if (wakeRef.current) {
      await wakeRef.current.release();
      wakeRef.current = null;
      setWakeActive(false);
      return;
    }
    try {
      const manager = (navigator as Navigator & { wakeLock?: { request: (kind: 'screen') => Promise<WakeLockSentinelLike> } }).wakeLock;
      if (!manager) return;
      wakeRef.current = await manager.request('screen');
      wakeRef.current.addEventListener('release', () => setWakeActive(false));
      setWakeActive(true);
    } catch { setWakeActive(false); }
  };

  return (
    <main className="game-shell">
      <div className="player-grid" data-count={game.players.length} data-format={game.format}>
        {game.players.map((player, index) => (
          <PlayerPanel key={player.id} game={game} player={player} position={index}
            onChange={(amount) => apply(adjustLife(game, player.id, amount), `${player.name} ${amount > 0 ? 'gains' : 'loses'} ${Math.abs(amount)} life`)}
            onCounters={() => open('counters', player.id)} />
        ))}
      </div>

      <nav className="game-toolbar" aria-label="Game controls">
        <a href="/" aria-label="Servitium home">S</a>
        <FullscreenButton compact />
        <button onClick={() => setGame(undo(game))} disabled={!game.history.length} aria-label="Undo last change">↶<small>Undo</small></button>
        <button onClick={() => setGame(redo(game))} disabled={!game.future.length} aria-label="Redo change">↷<small>Redo</small></button>
        <button aria-label="History" onClick={() => open('history')}>☷<small>History</small></button>
        <button aria-label="Tools" onClick={() => open('tools')}>✦<small>Tools</small></button>
        <button aria-label="Game" onClick={() => open('game')}>•••<small>Game</small></button>
      </nav>
      <div className="sr-only" aria-live="assertive">{announcement}</div>

      <dialog ref={dialogRef} className="sheet" onClose={() => setDialog(null)}>
        <button className="dialog-close" aria-label="Close dialog" onClick={() => setDialog(null)}>×</button>
        {dialog === 'counters' && selected && (
          <>
            <span className="eyebrow">{selected.name}</span><h2>Counters</h2>
            <Stepper label="Poison" value={selected.poison}
              onMinus={() => setGame(adjustPoison(game, selected.id, -1))}
              onPlus={() => setGame(adjustPoison(game, selected.id, 1))} />
            {game.format === 'commander' && (
              <div className="commander-list">
                <h3>Commander damage received</h3>
                {game.players.filter((source) => source.id !== selected.id).map((source) => (
                  <Stepper key={source.id} label={`From ${source.name}`}
                    value={selected.commanderDamage[source.id] ?? 0}
                    onMinus={() => setGame(adjustCommanderDamage(game, selected.id, source.id, -1))}
                    onPlus={() => setGame(adjustCommanderDamage(game, selected.id, source.id, 1))} />
                ))}
                <Stepper label="Commander tax" value={selected.commanderTax}
                  onMinus={() => setGame(adjustCommanderTax(game, selected.id, -2))}
                  onPlus={() => setGame(adjustCommanderTax(game, selected.id, 2))} />
                <p className="sheet-note">Commander damage also changes life. Undo reverses both.</p>
              </div>
            )}
          </>
        )}
        {dialog === 'history' && (
          <>
            <span className="eyebrow">GAME LOG</span><h2>Recent changes</h2>
            {game.history.length ? (
              <ol className="history-list">{[...game.history].reverse().map((entry) => (
                <li key={entry.id}><span>{entry.label}</span><time>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></li>
              ))}</ol>
            ) : <p className="empty">No changes yet.</p>}
          </>
        )}
        {dialog === 'tools' && (
          <>
            <span className="eyebrow">TABLE TOOLS</span><h2>Table roles</h2>
            <div className="role-grid">
              {game.players.map((player) => (
                <button key={`monarch-${player.id}`} aria-pressed={game.monarchId === player.id}
                  onClick={() => setGame(setRole(game, 'monarchId', game.monarchId === player.id ? null : player.id))}>
                  Crown {player.name}
                </button>
              ))}
              {game.players.map((player) => (
                <button key={`initiative-${player.id}`} aria-pressed={game.initiativeId === player.id}
                  onClick={() => setGame(setRole(game, 'initiativeId', game.initiativeId === player.id ? null : player.id))}>
                  Initiative {player.name}
                </button>
              ))}
            </div>
            {utilityResult && <output className="utility-result" aria-live="polite">{utilityResult}</output>}
            <div className="utility-row">
              <button onClick={() => {
                const result = `Coin: ${Math.random() < .5 ? 'heads' : 'tails'}`;
                setUtilityResult(result);
                setAnnouncement(result);
              }}>Flip coin</button>
              <button onClick={() => {
                const result = `D20: ${Math.floor(Math.random() * 20) + 1}`;
                setUtilityResult(result);
                setAnnouncement(result);
              }}>Roll d20</button>
              <button aria-pressed={wakeActive} onClick={() => void toggleWake()}>{wakeActive ? 'Screen awake' : 'Keep awake'}</button>
              <button aria-pressed={haptics} onClick={() => setHaptics((value) => !value)}>Haptics {haptics ? 'on' : 'off'}</button>
            </div>
          </>
        )}
        {dialog === 'game' && (
          <>
            <span className="eyebrow">{PRESETS.find((preset) => preset.id === game.format)?.label}</span>
            <h2>Game options</h2>
            <p className="sheet-note">{game.seatCount} seats · started at {game.startingLife} life</p>
            <button className="wide-button" onClick={doRematch}>Rematch with same setup</button>
            <button className="wide-button danger" onClick={newGame}>New game</button>
          </>
        )}
      </dialog>
    </main>
  );
}
