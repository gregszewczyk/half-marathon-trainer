export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userId');
}

export function getStoredUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userName');
}

export function isAuthenticated(): boolean {
  return !!getStoredUserId();
}

export function logout() {
  localStorage.removeItem('userId');
  localStorage.removeItem('userName');
  window.location.href = '/auth/login';
}
