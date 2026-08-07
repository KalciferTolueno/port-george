import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';

const AUDIO_SOURCE = '/audio/track.mp3';

export function MusicToggle(): JSX.Element {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = (): void => setPlaying(false);
    const onTimeUpdate = (): void => {
      setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  const toggle = async (): Promise<void> => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    try {
      audio.volume = 0.5;
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div className={`music-control${playing ? ' is-playing' : ''}`}>
      <audio ref={audioRef} src={AUDIO_SOURCE} loop preload="metadata" />
      <motion.button
        type="button"
        className="music-toggle"
        aria-label={playing ? 'Pause music' : 'Play music'}
        aria-pressed={playing}
        onClick={() => void toggle()}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m8 4 11 8-11 8z" />
          </svg>
        )}
      </motion.button>

      <div className="mini-player" aria-hidden="true">
        <span className="mini-player__eyebrow">Soundtrack</span>
        <span className="mini-player__title">George Array</span>
        <span
          className="mini-player__line"
          style={{ '--music-progress': `${progress * 100}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}
