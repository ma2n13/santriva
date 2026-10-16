/**
 * Standarisasi Penulisan Nama Santri
 * Format standar: Title Case (contoh: "Ahmad Said", bukan "AHMAD SAID" atau "ahmad said")
 */
export function formatSantriName(str: string | null | undefined): string {
  if (!str) return '';
  
  return str
    .trim()
    .toLowerCase()
    // Kapitalisasi huruf pertama kata, setelah spasi, tanda hubung, garis miring, atau kurung
    .replace(/(?:^|[\s\-\/\(])(['`’]?[a-z])/g, match => match.toUpperCase())
    // Penanganan apostrof internal nama Arab (cth: Ma'arif, Syifa'ul, Syafi'i)
    .replace(/(['`’])([a-z])/g, (_, p1, p2) => p1 + p2.toLowerCase())
    // Standarisasi partikel nama Arab (Al- / As- / Az- dll)
    .replace(/\bAl-([a-z])/g, (_, chr) => `Al-${chr.toUpperCase()}`)
    .replace(/\bAs-([a-z])/g, (_, chr) => `As-${chr.toUpperCase()}`)
    .replace(/\bAz-([a-z])/g, (_, chr) => `Az-${chr.toUpperCase()}`)
    .replace(/\s+/g, ' ');
}

/**
 * Normalisasi nama untuk perbandingan kesamaan / pencarian duplikat
 */
export function normalizeName(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['`’\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
