import { useEffect, useRef } from 'react';
import { reactionEventBus } from '../../events/ReactionEventBus';
import type { ReactionEventHandler } from '../../events/ReactionEventBus';

interface AutoplayManagerProps {
  autoplay: boolean;
  isPlaying: boolean;
  simulationMode: 'molecule' | 'single' | 'rate';
  onReset: () => Promise<void> | void;
  onPlay: () => Promise<void> | void;
}

const AUTOPLAY_DELAY_MS = 2000;
const INITIAL_AUTOPLAY_DELAY_MS = 1500;

export const AutoplayManager: React.FC<AutoplayManagerProps> = ({
  autoplay,
  isPlaying,
  simulationMode,
  onReset,
  onPlay,
}) => {
  const timeoutRef = useRef<number | null>(null);
  const latestPropsRef = useRef({
    autoplay,
    isPlaying,
    simulationMode,
    onReset,
    onPlay,
  });

  const scheduleImmediateRun = () => {
    const latest = latestPropsRef.current;
    if (!latest.autoplay || latest.simulationMode !== 'single' || latest.isPlaying) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (typeof window === 'undefined') {
      return;
    }

    timeoutRef.current = window.setTimeout(async () => {
      timeoutRef.current = null;
      const current = latestPropsRef.current;
      if (!current.autoplay || current.simulationMode !== 'single' || current.isPlaying) {
        return;
      }

      await current.onReset();

      const afterReset = latestPropsRef.current;
      if (!afterReset.autoplay || afterReset.simulationMode !== 'single') {
        return;
      }

      await afterReset.onPlay();
    }, INITIAL_AUTOPLAY_DELAY_MS);
  };

  useEffect(() => {
    latestPropsRef.current = {
      autoplay,
      isPlaying,
      simulationMode,
      onReset,
      onPlay,
    };
  }, [autoplay, isPlaying, simulationMode, onReset, onPlay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!autoplay || simulationMode !== 'single') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (!isPlaying) {
      scheduleImmediateRun();
    }

    const scheduleNextRun = () => {
      const latest = latestPropsRef.current;
      if (!latest.autoplay || latest.simulationMode !== 'single' || !latest.isPlaying) {
        return;
      }

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (typeof window === 'undefined') {
        return;
      }

      timeoutRef.current = window.setTimeout(async () => {
        timeoutRef.current = null;
        const current = latestPropsRef.current;

        if (!current.autoplay || current.simulationMode !== 'single' || !current.isPlaying) {
          return;
        }

        await current.onReset();

        const afterReset = latestPropsRef.current;
        if (!afterReset.autoplay || afterReset.simulationMode !== 'single') {
          return;
        }

        await afterReset.onPlay();
      }, AUTOPLAY_DELAY_MS);
    };

    const handler: ReactionEventHandler = event => {
      if (event.type === 'collision-detected' || event.type === 'reaction-completed') {
        scheduleNextRun();
      }
    };

    reactionEventBus.on('collision-detected', handler);
    reactionEventBus.on('reaction-completed', handler);

    return () => {
      reactionEventBus.off('collision-detected', handler);
      reactionEventBus.off('reaction-completed', handler);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [autoplay, simulationMode, isPlaying]);

  useEffect(() => {
    if (!isPlaying && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [isPlaying]);

  return null;
};

