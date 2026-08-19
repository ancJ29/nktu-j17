import './SheetGridCellInput.css';

type Props = {
  readonly value: string;
  readonly onChange: (value: string) => void;

  readonly name: string;

  readonly label: string;
  readonly readOnly?: boolean;

  readonly changed?: boolean;

  readonly multiline?: boolean;
};

export function SheetGridCellInput({
  value,
  onChange,
  name,
  label,
  readOnly,
  changed,
  multiline,
}: Props) {
  if (multiline) {
    return (
      <textarea
        className="sheet-grid-cell sheet-grid-cell--area"
        name={name}
        aria-label={label}
        rows={2}
        autoComplete="off"
        value={value}
        readOnly={readOnly}
        data-changed={changed ? 'true' : undefined}
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    );
  }
  return (
    <input
      className="sheet-grid-cell"
      name={name}
      aria-label={label}

      autoComplete="off"
      value={value}
      readOnly={readOnly}
      data-changed={changed ? 'true' : undefined}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}
