export interface ParsedRow {
    dayNumber: number;
    time?: string;
    title: string;
    description?: string;
    location?: string;
    price?: string;
  }
  
  export function parseItineraryMarkdown(md: string): ParsedRow[] {
    const lines = md.split("\n").map(l => l.trim());
  
    // Cari header tabel itinerary
    const headerIndex = lines.findIndex(l =>
      l.toLowerCase().includes("| day") &&
      l.toLowerCase().includes("time") &&
      l.toLowerCase().includes("title")
    );
  
    if (headerIndex === -1) return [];
  
    const rows: ParsedRow[] = [];
  
    // Mulai setelah header & separator
    for (let i = headerIndex + 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.startsWith("|")) break;
  
      const cols = line
        .split("|")
        .slice(1, -1)
        .map(c => c.trim());
  
      if (cols.length < 4) continue;
  
      const dayMatch = cols[0].match(/\d+/);
      const dayNumber = dayMatch ? parseInt(dayMatch[0]) : 1;
  
      rows.push({
        dayNumber,
        time: cols[1] || null,
        title: cols[2] || "Untitled Activity",
        description: cols[3] || null,
        location: cols[4] || null,
        price: cols[5] || null,
      });
    }
  
    return rows;
  }
  