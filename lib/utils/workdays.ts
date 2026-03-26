// Returns the most recent Monday–Friday before the given date.
// If the given date is itself a workday, it still returns the previous one.
export function getPrevWorkday(date: Date): Date {
  const d = new Date(date);
  do {
    d.setDate(d.getDate() - 1);
  } while (d.getDay() === 0 || d.getDay() === 6); // skip Sunday (0) and Saturday (6)
  return d;
}

// Returns the next Monday–Friday after the given date.
// If the given date is itself a workday, it still returns the next one.
export function getNextWorkday(date: Date): Date {
  const d = new Date(date);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}
