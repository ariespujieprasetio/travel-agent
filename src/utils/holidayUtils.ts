export function getHolidaysInRange(
    holidays: any[],
    startDate: string,
    endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    return holidays.filter((h) => {
      const iso = h.date.iso.split("T")[0];
      const d = new Date(iso);
      return d >= start && d <= end;
    });
  }
  
  export function formatHolidaySummary(holidays: any[]) {
    if (!holidays.length) {
      return "No major national public holidays are typically observed during these dates.";
    }
  
    return holidays
      .map(
        (h) =>
          `• ${h.name} (${h.date.iso.split("T")[0]}) — Public holiday. Expect larger crowds and possible closures.`
      )
      .join("\n");
  }
  