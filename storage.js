/* ---------------------------------------------------------------------------
 * Storage layer
 * ---------------------------------------------------------------------------
 * Everything the app persists lives behind this file, in a single localStorage
 * key holding a JSON array of session objects. The rest of the app never
 * touches localStorage directly - it calls Storage.* functions. That keeps a
 * future swap (e.g. to a real backend) to a single file.
 *
 * Session shape:
 * {
 *   id: string,
 *   date: 'YYYY-MM-DD',
 *   createdAt: string (ISO timestamp),
 *   subject: 'Mathematics' | 'Physics' | 'Chemistry',
 *   chapter: string,
 *   explanation: string | null,   // only ever set for Chemistry
 *   photos: [{ id, name, dataUrl }]
 * }
 * ------------------------------------------------------------------------ */

const Storage = (function () {
  const KEY = 'study-evidence-tracker:sessions';

  function getAll() {
    try {
      const raw = localStorage.getItem(KEY);
      const sessions = raw ? JSON.parse(raw) : [];
      sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return sessions;
    } catch (err) {
      console.error('Could not read sessions from localStorage:', err);
      return [];
    }
  }

  function saveAll(sessions) {
    try {
      localStorage.setItem(KEY, JSON.stringify(sessions));
      return true;
    } catch (err) {
      // Most likely QuotaExceededError - localStorage is typically ~5-10MB,
      // and photos are stored as base64 text, so this can happen with a lot
      // of high-res images over time.
      console.error('Could not save sessions to localStorage:', err);
      return false;
    }
  }

  function add(session) {
    const sessions = getAll();
    sessions.unshift(session);
    const ok = saveAll(sessions);
    if (!ok) {
      throw new Error(
        'Storage is full. Try removing a few old photos, or clearing very old sessions.'
      );
    }
    return session;
  }

  function remove(id) {
    const sessions = getAll().filter((s) => s.id !== id);
    saveAll(sessions);
  }

  /** Convert an uploaded File into a base64 data URL for storage. */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    // Fallback for older WebViews without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  return { getAll, add, remove, fileToDataUrl, uuid };
})();
