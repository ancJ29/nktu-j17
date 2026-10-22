import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

import { Box, Button, Code, Stack, Text, Title } from '@mantine/core';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box p="xl">
          <Stack align="center" gap="md">
            <Title order={2} c="red">
              Something went wrong
            </Title>
            <Text c="dimmed">An unexpected error occurred. Please try again.</Text>
            {this.state.error && (
              <Code block maw={600}>
                {this.state.error.message}
              </Code>
            )}
            <Button onClick={this.handleReset}>Try Again</Button>
          </Stack>
        </Box>
      );
    }

    return this.props.children;
  }
}
