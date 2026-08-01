const DateUtils = (function () {
  function toKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function todayKey() {
    return toKey(new Date());
  }

  /** e.g. "Sunday, 26 July 2026" */
  function formatLongDate(dateKey) {
    const d = new Date(`${dateKey}T00:00:00`);
    return d.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /** e.g. "26 Jul" */
  function formatShortDate(dateKey) {
    const d = new Date(`${dateKey}T00:00:00`);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  return { toKey, todayKey, formatLongDate, formatShortDate };
})();
