import type { FormHTMLAttributes, ReactNode } from 'react';
import type { UseFormReturnType } from '@mantine/form';
import { blockImplicitSubmit } from './blockImplicitSubmit';

type FormProps<T> = {
  readonly form: UseFormReturnType<T>;
  readonly onSubmit: (values: T) => void;

  readonly onError?: Parameters<UseFormReturnType<T>['onSubmit']>[1];

  readonly submitOnEnter?: boolean;
  readonly children: ReactNode;
} & Omit<FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError' | 'children'>;

export function Form<T>({
  form,
  onSubmit,
  onError,
  submitOnEnter,
  children,
  ...rest
}: FormProps<T>) {
  return (
    <form
      onSubmit={form.onSubmit(onSubmit, onError)}
      onKeyDown={submitOnEnter ? undefined : blockImplicitSubmit}
      {...rest}
    >
      {children}
    </form>
  );
}
