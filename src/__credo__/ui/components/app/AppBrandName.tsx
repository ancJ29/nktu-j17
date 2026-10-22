import { Text, type TextProps } from '@mantine/core';
import { useMemo } from 'react';
import { sanitizeBrandHtml } from '../../utils/sanitize-html';

type AppBrandNameProps = TextProps & {
  name: string;

  nameHtml?: string;
};

export function AppBrandName({ name, nameHtml, ...textProps }: AppBrandNameProps) {
  const html = useMemo(() => sanitizeBrandHtml(nameHtml), [nameHtml]);

  if (html.trim()) {
    return <Text component="div" {...textProps} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (!name) return null;
  return <Text {...textProps}>{name}</Text>;
}
