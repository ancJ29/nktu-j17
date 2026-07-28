import type { UseFormReturnType } from '@mantine/form';
import { useEffect, useRef, useState } from 'react';

export function useInitFormFromFetch<TValues>(
  form: UseFormReturnType<TValues>,
  id: string | undefined,
  init: (id: string) => Promise<TValues | null>,
  onError?: (err: unknown) => void,
): boolean {
  const [fetching, setFetching] = useState<boolean>(!!id);

  const formRef = useRef(form);
  const initRef = useRef(init);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    formRef.current = form;
    initRef.current = init;
    onErrorRef.current = onError;
  });

  const inflightRef = useRef<{ id: string; promise: Promise<TValues | null> } | null>(null);

  useEffect(() => {
    setFetching(!!id);
    if (!id) return;
    let cancelled = false;

    let promise: Promise<TValues | null>;
    if (inflightRef.current && inflightRef.current.id === id) {
      promise = inflightRef.current.promise;
    } else {
      promise = initRef.current(id);
      inflightRef.current = { id, promise };
    }

    promise
      .then((values) => {
        if (cancelled) return;
        if (values !== null) {
          formRef.current.setValues(values);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        onErrorRef.current?.(err);
      })
      .finally(() => {
        if (inflightRef.current?.promise === promise) inflightRef.current = null;
        if (cancelled) return;
        setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return fetching;
}
