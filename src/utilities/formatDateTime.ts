export function formatDateTime(date: string): string { return new Date(date).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }); }
