export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character)
}

export function safeEmailFilename(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'efoka'
}
