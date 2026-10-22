import { useCallback, useState } from 'react';

type UseAuthSubmitOptions<TValues, TResult> = {
  onSubmit: (values: TValues) => Promise<TResult>;

  onSuccess?: (result: TResult) => void;

  onError?: (error: Error) => void;

  getErrorMessage?: (error: unknown) => string;
};

type UseAuthSubmitResult<TValues> = {
  isLoading: boolean;

  error: string | null;

  isSubmitted: boolean;

  clearError: () => void;

  resetSubmitted: () => void;

  handleSubmit: (values: TValues) => Promise<void>;
};

export function useAuthSubmit<TValues, TResult = { success: boolean }>(
  options: UseAuthSubmitOptions<TValues, TResult>,
): UseAuthSubmitResult<TValues> {
  const {
    onSubmit,
    onSuccess,
    onError,
    getErrorMessage = (err) =>
      err instanceof Error ? err.message : 'An error occurred. Please try again.',
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetSubmitted = useCallback(() => {
    setIsSubmitted(false);
  }, []);

  const handleSubmit = useCallback(
    async (values: TValues) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await onSubmit(values);
        setIsSubmitted(true);
        onSuccess?.(result);
      } catch (err) {
        const errorMessage = getErrorMessage(err);
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    },
    [onSubmit, onSuccess, onError, getErrorMessage],
  );

  return {
    isLoading,
    error,
    isSubmitted,
    clearError,
    resetSubmitted,
    handleSubmit,
  };
}
