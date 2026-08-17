import { useEffect, useState } from 'react';

type FullscreenDocument = Document & {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

function fullscreenElement(): Element | null {
  const current = document as FullscreenDocument;
  return document.fullscreenElement ?? current.webkitFullscreenElement ?? null;
}

export default function FullscreenButton({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  const [active, setActive] = useState(() => fullscreenElement() !== null);
  const root = document.documentElement as FullscreenElement;
  const current = document as FullscreenDocument;
  const supported = typeof root.requestFullscreen === 'function'
    || typeof root.webkitRequestFullscreen === 'function';

  useEffect(() => {
    const update = () => setActive(fullscreenElement() !== null);
    document.addEventListener('fullscreenchange', update);
    document.addEventListener('webkitfullscreenchange', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      document.removeEventListener('webkitfullscreenchange', update);
    };
  }, []);

  const toggle = async () => {
    try {
      if (fullscreenElement()) {
        const exit = document.exitFullscreen?.bind(document)
          ?? current.webkitExitFullscreen?.bind(current);
        await exit?.();
      } else {
        const enter = root.requestFullscreen?.bind(root)
          ?? root.webkitRequestFullscreen?.bind(root);
        await enter?.();
      }
    } catch {
      // Browsers may reject fullscreen outside an allowed user gesture.
    }
  };

  return (
    <button
      type="button"
      className={`fullscreen-button${compact ? ' compact' : ''}${iconOnly ? ' icon-only' : ''}`}
      aria-pressed={active}
      aria-label={active ? 'Exit full screen' : 'Enter full screen'}
      disabled={!supported}
      onClick={() => void toggle()}
    >
      <span aria-hidden="true">⛶</span>
      {!iconOnly && <small>{active ? 'Exit full screen' : 'Full screen'}</small>}
    </button>
  );
}
