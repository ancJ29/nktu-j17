import { useEffect, useState } from 'react';
import { listQueuedTransitions, subscribeTransitionQueue } from './transitionQueue';

export function usePendingSyncIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      void listQueuedTransitions().then((queued) => {
        if (!cancelled) setIds(new Set(queued.map((entry) => entry.id)));
      });
    };
    read();
    const unsubscribe = subscribeTransitionQueue(read);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return ids;
}
