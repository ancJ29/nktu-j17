import { ActionIcon, Autocomplete, type AutocompleteProps } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { PLACE_INPUT_STYLES, PLACE_SUGGESTION_LIMIT } from '../transport-orders/placeSuggestions';

type PlaceProps = Omit<AutocompleteProps, 'data' | 'limit' | 'styles'> & {
  readonly suggestions: string[];
};

export function RoutePlaceInput({ suggestions, ...props }: PlaceProps) {
  return (
    <Autocomplete
      data={suggestions}
      limit={PLACE_SUGGESTION_LIMIT}
      styles={PLACE_INPUT_STYLES}
      {...props}
    />
  );
}

export function RouteRowRemove({
  disabled,
  onClick,
}: {
  readonly disabled: boolean;
  readonly onClick: () => void;
}) {
  return (
    <ActionIcon color="red" variant="subtle" disabled={disabled} onClick={onClick}>
      <IconTrash size={16} />
    </ActionIcon>
  );
}
