// simple auth helper: token and lastActive management
const TOKEN_KEY = "token";
const LAST_ACTIVE_KEY = "lastActive";

export function setToken(token) {
  if (!token) return;
  localStorage.setItem(TOKEN_KEY, token);
  setLastActive();
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LAST_ACTIVE_KEY);
}

export function setLastActive() {
  localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
}

export function getLastActive() {
  const v = localStorage.getItem(LAST_ACTIVE_KEY);
  return v ? parseInt(v, 10) : null;
}

export function isActiveWithinHours(hours = 24) {
  const last = getLastActive();
  if (!last) return false;
  const diff = Date.now() - last;
  return diff <= hours * 60 * 60 * 1000;
}

export function attachActivityListeners() {
  const update = () => setLastActive();
  window.addEventListener("click", update);
  window.addEventListener("keydown", update);
  window.addEventListener("mousemove", update);
  window.addEventListener("scroll", update, { passive: true });
  return () => {
    window.removeEventListener("click", update);
    window.removeEventListener("keydown", update);
    window.removeEventListener("mousemove", update);
    window.removeEventListener("scroll", update);
  };
}

export default {
  setToken,
  getToken,
  clearAuth,
  setLastActive,
  isActiveWithinHours,
  attachActivityListeners,
};
