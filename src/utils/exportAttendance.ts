import * as XLSX from 'xlsx';

const INDO_DAY_NAMES = ['Ahd', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export interface ExportAttendanceOptions {
  nama: string;
  kelas?: string | null;
  asrama?: string | null;
  logs: any[];
  types: { id: string; nama: string }[];
  currentDate: Date;
}

/**
 * Generate dan download file Excel (.xlsx) untuk riwayat absensi bulanan santri
 */
export function exportAttendanceToExcel({
  nama,
  kelas,
  asrama,
  logs,
  types,
  currentDate
}: ExportAttendanceOptions) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  // Filter log hanya pada bulan yang dipilih
  const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const monthLogs = logs.filter(l => l.tgl_melanggar >= startStr && l.tgl_melanggar <= endStr);

  // Buat Baris Header
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const dayName = INDO_DAY_NAMES[d.getDay()];
    return `${i + 1}\n(${dayName})`;
  });

  const headers = ['Jenis Kegiatan / Pelanggaran', ...dayHeaders, 'Total'];

  // Buat Data Baris untuk tiap Master Jenis
  const rows: (string | number)[][] = [];

  // Baris Info Santri & Bulan
  rows.push([`Riwayat Absensi: ${nama}`]);
  rows.push([`Kelas: ${kelas || '-'} | Asrama: ${asrama || '-'} | Periode: ${monthStr}`]);
  rows.push([]); // Baris kosong pemisah
  rows.push(headers);

  let grandTotal = 0;

  types.forEach(type => {
    const row: (string | number)[] = [type.nama];
    let typeTotal = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const found = monthLogs.find(l => {
        const matchesJenis = (l.jenis_id && l.jenis_id === type.id) || (l.master_jenis?.nama === type.nama);
        return matchesJenis && l.tgl_melanggar === dateStr;
      });

      if (found) {
        row.push(found.status_tazir === 'Sudah' ? 'X (Ditakzir)' : 'X (Belum)');
        typeTotal++;
      } else {
        row.push('');
      }
    }

    row.push(typeTotal);
    grandTotal += typeTotal;
    rows.push(row);
  });

  // Baris Total per hari
  const totalRow: (string | number)[] = ['TOTAL HARIAN'];
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayCount = monthLogs.filter(l => l.tgl_melanggar === dateStr).length;
    totalRow.push(dayCount > 0 ? dayCount : 0);
  }
  totalRow.push(grandTotal);
  rows.push(totalRow);

  // Buat Worksheet & Workbook
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Atur lebar kolom
  const colWidths = [{ wch: 32 }, ...Array(daysInMonth).fill({ wch: 8 }), { wch: 10 }];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Absensi');

  const fileName = `Riwayat_${nama.replace(/\s+/g, '_')}_${currentDate.toLocaleString('id-ID', { month: 'short' })}_${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Membuka jendela cetak (Print / Save as PDF) dengan format landscape yang elegan
 */
export function exportAttendanceToPrint({
  nama,
  kelas,
  asrama,
  logs,
  types,
  currentDate
}: ExportAttendanceOptions) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr = currentDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  const monthLogs = logs.filter(l => l.tgl_melanggar >= startStr && l.tgl_melanggar <= endStr);

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const d = new Date(year, month, day);
    const dayName = INDO_DAY_NAMES[d.getDay()];
    const isSunday = d.getDay() === 0;
    return { day, dayName, isSunday };
  });

  const printWindow = window.open('', '_blank', 'width=1100,height=750');
  if (!printWindow) {
    alert('Jendela pop-up diblokir oleh browser. Izinkan pop-up untuk mencetak.');
    return;
  }

  const tableRows = types.map(type => {
    let typeTotal = 0;
    const cells = daysArray.map(({ day }) => {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const found = monthLogs.find(l => {
        const matchesJenis = (l.jenis_id && l.jenis_id === type.id) || (l.master_jenis?.nama === type.nama);
        return matchesJenis && l.tgl_melanggar === dateStr;
      });

      if (found) {
        typeTotal++;
        const bg = found.status_tazir === 'Sudah' ? '#f59e0b' : '#dc2626';
        return `<td style="background-color: ${bg}; color: white; font-weight: bold; text-align: center; font-size: 10px;">X</td>`;
      }
      return `<td style="text-align: center; color: #cbd5e1; font-size: 9px;">-</td>`;
    }).join('');

    return `
      <tr>
        <td style="font-weight: 600; font-size: 11px; padding: 6px 8px; border: 1px solid #cbd5e1;">${type.nama}</td>
        ${cells}
        <td style="font-weight: bold; text-align: center; font-size: 11px; background-color: #f1f5f9; border: 1px solid #cbd5e1;">${typeTotal}</td>
      </tr>
    `;
  }).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Riwayat Absensi - ${nama}</title>
      <style>
        @page { size: landscape; margin: 12mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; margin: 0; padding: 10px; }
        .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px; border-bottom: 2px solid #065f46; padding-bottom: 8px; }
        h1 { margin: 0; font-size: 18px; color: #065f46; }
        .meta { font-size: 12px; color: #475569; margin-top: 4px; }
        .legend { font-size: 10px; display: flex; gap: 12px; align-items: center; }
        .legend-item { display: inline-flex; align-items: center; gap: 4px; }
        .box { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
        th { background: #064e3b; color: white; padding: 5px 3px; font-weight: bold; border: 1px solid #042f2e; text-align: center; }
        th.sunday { color: #fca5a5; }
        td { border: 1px solid #cbd5e1; height: 24px; padding: 2px; }
        .footer { margin-top: 15px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>Lembar Catatan Absensi & Kedisiplinan Santri</h1>
          <div class="meta">
            <b>Nama:</b> ${nama} &nbsp;|&nbsp; <b>Kelas:</b> ${kelas || '-'} &nbsp;|&nbsp; <b>Asrama:</b> ${asrama || '-'} &nbsp;|&nbsp; <b>Periode:</b> ${monthStr}
          </div>
        </div>
        <div class="legend">
          <span class="legend-item"><span class="box" style="background:#dc2626;"></span> Belum Takzir (X)</span>
          <span class="legend-item"><span class="box" style="background:#f59e0b;"></span> Sudah Ditakzir (X)</span>
          <span class="legend-item"><span class="box" style="background:#f1f5f9; border: 1px solid #cbd5e1;"></span> Tertib (-)</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="text-align: left; padding-left: 8px; width: 160px;">Jenis Kegiatan</th>
            ${daysArray.map(d => `
              <th class="${d.isSunday ? 'sunday' : ''}">
                <div>${d.day}</div>
                <div style="font-size: 8px; opacity: 0.9;">${d.dayName}</div>
              </th>
            `).join('')}
            <th style="width: 45px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="footer">
        <div>Dicetak melalui Sistem SIM Santri Santriva</div>
        <div>Tanggal cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
