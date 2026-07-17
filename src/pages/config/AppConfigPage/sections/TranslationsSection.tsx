import { Textarea } from '@mantine/core';
import { memo, useEffect, useState } from 'react';

export const TranslationsSection = memo(function TranslationsSection({
  translations,
  onChange,
}: {
  translations: Record<string, Record<string, unknown>>;
  onChange: (tr: Record<string, Record<string, unknown>>) => void;
}) {
  const [json, setJson] = useState(() => JSON.stringify(translations, null, 2));
  const [error, setError] = useState('');

  useEffect(() => {
    setJson(JSON.stringify(translations, null, 2));
    setError('');
  }, [translations]);

  const handleChange = (value: string) => {
    setJson(value);
    if (!value.trim()) {
      setError('');
      return;
    }
    try {
      const parsed = JSON.parse(value) as Record<string, Record<string, unknown>>;
      setError('');
      onChange(parsed);
    } catch {
      setError('Invalid JSON in translations config');
    }
  };

  return (
    <Textarea
      value={json}
      onChange={(e) => handleChange(e.currentTarget.value)}
      error={error}
      minRows={6}
      maxRows={20}
      autosize
      styles={{ input: { fontFamily: 'monospace', fontSize: 'var(--mantine-font-size-xs)' } }}
    />
  );
});
