// Clamp a day-of-month to the last valid day of the target month so that
// `new Date(year, month, 31)` does not roll over into the next month.
export function dueDateInMonth(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(Math.max(day, 1), lastDay))
}

export function nextDueDate(day: number, now: Date = new Date()): Date {
  const year = now.getFullYear()
  const month = now.getMonth()
  let next = dueDateInMonth(year, month, day)
  if (next < now) {
    next = dueDateInMonth(year, month + 1, day)
  }
  return next
}
