/**
 * Given a list of sessions, returns { currentStreak, totalDays }.
 * A "day" counts once no matter how many sessions were logged on it.
 * The streak is the number of consecutive days (ending today or yesterday)
 * that have at least one logged session with evidence.
 */
const Streak = (function () {
  function compute(sessions) {
    const uniqueDays = [...new Set(sessions.map((s) => s.date))].sort().reverse();
    const totalDays = uniqueDays.length;

    if (totalDays === 0) return { currentStreak: 0, totalDays: 0 };

    const today = DateUtils.todayKey();
    const cursor = new Date(`${today}T00:00:00`);

    // If today has no entry yet, the streak still "counts" through yesterday -
    // it only breaks once a full day passes with nothing logged.
    if (uniqueDays[0] !== today) {
      cursor.setDate(cursor.getDate() - 1);
      if (DateUtils.toKey(cursor) !== uniqueDays[0]) {
        return { currentStreak: 0, totalDays };
      }
    }

    let streak = 1;
    cursor.setTime(new Date(`${uniqueDays[0]}T00:00:00`).getTime());
    cursor.setDate(cursor.getDate() - 1);

    for (let i = 1; i < uniqueDays.length; i++) {
      if (uniqueDays[i] === DateUtils.toKey(cursor)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return { currentStreak: streak, totalDays };
  }

  return { compute };
})();
