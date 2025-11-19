const API_URL = 'http://localhost:5000/api'; // Your backend URL

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const { headers = {}, body, ...restOptions } = options;

  const authData = localStorage.getItem('lnmBusAuth');
  let token = null;
  if (authData) {
    token = JSON.parse(authData).token;
  }

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (token) {
    (defaultHeaders as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers: defaultHeaders,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.message || `Error: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  
  // Handle file downloads
  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('application/pdf') || contentType.includes('text/csv'))) {
    return response.blob();
  }

  // Handle no-content responses (like DELETE)
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export default apiFetch;