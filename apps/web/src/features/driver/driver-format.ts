export function formatMinutesToTime(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
}

export function formatMinutesDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours === 0 ? `${mins}m` : `${hours}h ${mins}m`;
}
