// The caller must resolve and verify the employee from the Firebase ID token first.
export function canExportCsv(employee: { email: string } | null): boolean {
  return employee?.email.toLowerCase() === 'jet@gotofunapp.com';
}

export function encodeCsv(rows: unknown[][]): string {
  return '\uFEFF' + rows.map(row => row.map(value => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+@-]|^[\t\r\n]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  }).join(',')).join('\r\n');
}
