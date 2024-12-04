export function formatDate(date: Date, format: string = "PPP"): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatters = {
    PPP: (date: Date) => {
      const month = months[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      const suffix = getDaySuffix(day);
      return `${month} ${day}${suffix}, ${year}`;
    },
  };

  function getDaySuffix(day: number): string {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }

  return (
    formatters[format as keyof typeof formatters]?.(date) ||
    formatters["PPP"](date)
  ); // Default to PPP format if format not found
}
