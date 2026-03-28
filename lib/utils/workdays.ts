// Returns the most recent Monday–Friday before the given date.
// If the given date is itself a workday, it still returns the previous one.
// All arithmetic uses UTC to avoid timezone-dependent shifts.
export function getPrevWorkday(date: Date): Date {
  const d = new Date(date);
  do {
    d.setUTCDate(d.getUTCDate() - 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6); // skip Sunday (0) and Saturday (6)
  return d;
}

// Returns the next Monday–Friday after the given date.
// If the given date is itself a workday, it still returns the next one.
export function getNextWorkday(date: Date): Date {
  const d = new Date(date);
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d;
}

// Returns the same day if it's Monday, otherwise returns the previous workday.
// Used for business users to calculate bin-out day.
export function getBinOutDay(date: Date): Date {
  const d = new Date(date);
  if (d.getUTCDay() === 1) return d; // Monday → same day
  return getPrevWorkday(date);
}
