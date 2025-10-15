export function setToken(token: string, userData: any) {
  localStorage.setItem('gambino_token', token);
  localStorage.setItem('gambino_user', JSON.stringify(userData));
}

export function getToken() {
  return localStorage.getItem('gambino_token');
}

export function getUser() {
  const user = localStorage.getItem('gambino_user');
  return user ? JSON.parse(user) : null;
}

export function clearToken() {
  localStorage.removeItem('gambino_token');
  localStorage.removeItem('gambino_user');
}
