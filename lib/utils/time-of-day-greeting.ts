const AFTERNOON_START_HOUR = 12;
const EVENING_START_HOUR = 17;
const NIGHT_START_HOUR = 22;
const MORNING_START_HOUR = 5;

export function timeOfDayGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour >= NIGHT_START_HOUR || hour < MORNING_START_HOUR) return 'Working late';
  if (hour >= EVENING_START_HOUR) return 'Good evening';
  if (hour >= AFTERNOON_START_HOUR) return 'Good afternoon';
  return 'Good morning';
}
