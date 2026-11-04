export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'financeiro.theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'system' ? v : 'light';
  } catch {
    return 'light';
  }
}

/** Toggles `.dark` on <html>; index.html runs the same check inline so the first paint is right. */
export function applyTheme(pref: ThemePref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111412' : '#F4F1EA');
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* private mode: still applies for this visit */
  }
  applyTheme(pref);
}

media.addEventListener('change', () => applyTheme());
