import './SheetGridCellInput.css';

type Props = {
  readonly value: string;
  readonly onChange: (value: string) => void;

  readonly name: string;

  readonly label: string;
  readonly readOnly?: boolean;

  readonly changed?: boolean;

  readonly dense?: boolean;
};

export function SheetGridCellInput({
  value,
  onChange,
  name,
  label,
  readOnly,
  changed,
  dense,
}: Props) {
  return (
    <input
      className="sheet-grid-cell"
      name={name}
      aria-label={label}

      autoComplete="off"
      value={value}
      readOnly={readOnly}
      data-changed={changed ? 'true' : undefined}
      data-dense={dense ? 'true' : undefined}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}
