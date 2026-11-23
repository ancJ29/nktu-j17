export type EmployeeNameDisplay = 'fullName' | 'shortName';

export function employeeDisplayName(
  employee: { name: string; extra?: { shortName?: string } } | undefined,
  display: EmployeeNameDisplay = 'fullName',
): string {
  if (!employee) return '';
  if (display === 'shortName') {
    const short = employee.extra?.shortName?.trim();
    if (short) return short;
  }
  return employee.name;
}
