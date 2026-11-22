// Thin wrapper over fetch. Every response is { ok, error?, ...data }.
async function request(method, url, body, { form = false } = {}) {
  const init = { method, credentials: 'same-origin', headers: {} }
  if (body !== undefined) {
    if (form) init.body = body
    else {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
  }
  let res
  try {
    res = await fetch(`/api${url}`, init)
  } catch {
    return { ok: false, error: 'We could not reach the server. Check your connection and try again.' }
  }
  let data = {}
  try {
    data = await res.json()
  } catch {
    data = { ok: res.ok }
  }
  if (!res.ok && !data.error) data.error = 'Something went wrong. Please try again.'
  return { ...data, ok: res.ok && data.ok !== false, status: res.status }
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body = {}) => request('POST', url, body),
  put: (url, body = {}) => request('PUT', url, body),
  patch: (url, body = {}) => request('PATCH', url, body),
  del: (url) => request('DELETE', url),
  upload: (url, formData) => request('POST', url, formData, { form: true }),
}

// Submits the PayFast redirect form returned by the API.
export function submitRedirect({ action, fields }) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = k
    input.value = v
    form.appendChild(input)
  }
  document.body.appendChild(form)
  form.submit()
}
