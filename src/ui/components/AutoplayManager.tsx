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
const AUTOPLAY_WATCHDOG_MS = 8000;

export const AutoplayManager: React.FC<AutoplayManagerProps> = ({
  autoplay,
  isPlaying,
  simulationMode,
  onReset,
  onPlay,
}) => {
  const timeoutRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const hasInitialRunRef = useRef(false);
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

  const clearScheduledRuns = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  const armWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
    }

    if (typeof window === 'undefined') {
      return;
    }

    watchdogRef.current = window.setTimeout(async () => {
      watchdogRef.current = null;
      const current = latestPropsRef.current;
      if (!current.autoplay || current.simulationMode !== 'single') {
        return;
      }

      await current.onReset();

      const afterReset = latestPropsRef.current;
      if (!afterReset.autoplay || afterReset.simulationMode !== 'single') {
        return;
      }

      await afterReset.onPlay();
      armWatchdog();
    }, AUTOPLAY_WATCHDOG_MS);
  };

  useEffect(() => {
    return () => {
      clearScheduledRuns();
    };
  }, []);

  useEffect(() => {
    if (!autoplay || simulationMode !== 'single') {
      clearScheduledRuns();
      hasInitialRunRef.current = false;
      return;
    }

    // Only schedule initial run once when autoplay is first enabled and not playing
    // Don't auto-restart when user manually pauses
    // In single collision mode, autoplay should work even if isPlaying is false initially
    if (!isPlaying && !hasInitialRunRef.current) {
      scheduleImmediateRun();
      hasInitialRunRef.current = true;
    }

    const scheduleNextRun = () => {
      const latest = latestPropsRef.current;
      if (!latest.autoplay || latest.simulationMode !== 'single' || !latest.isPlaying) {
        return;
      }

      clearScheduledRuns();

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
        armWatchdog();
      }
    };

    reactionEventBus.on('collision-detected', handler);
    reactionEventBus.on('reaction-completed', handler);

    return () => {
      reactionEventBus.off('collision-detected', handler);
      reactionEventBus.off('reaction-completed', handler);
      clearScheduledRuns();
    };
  }, [autoplay, simulationMode, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      clearScheduledRuns();
    } else {
      armWatchdog();
    }
  }, [isPlaying]);

  return null;
};

