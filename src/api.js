export async function api(action, { method = 'GET', body, query, signal } = {}) {
  const params = query ? '?' + new URLSearchParams(query) : '';
  const response = await fetch('/api/' + action + params, {
    method, signal, credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Something went wrong. Please try again.');
    error.status = response.status;
    throw error;
  }
  return result;
}
