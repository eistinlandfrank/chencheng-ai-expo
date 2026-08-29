'use client';

function cookieValue(name: string) {
  const prefix = `${name}=`;
  const entry = document.cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : '';
}

export function protectedJsonHeaders() {
  const csrfToken = cookieValue('__Host-expo_csrf') || cookieValue('expo_csrf');
  return {
    'content-type': 'application/json',
    'x-csrf-token': csrfToken,
  };
}
