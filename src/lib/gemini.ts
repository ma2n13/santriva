import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Santri } from '../types';

export interface LaporanOptions {
  santri: Partial<Santri>;
  logs: any[];
  periode: string; // contoh: 'Oktober 2026'
  portalUrl: string;
  tone?: 'tarbiyah' | 'formal' | 'tegas';
  catatanTambahan?: string;
  apiKey?: string;
}

/**
 * Mengambil API Key Gemini dari Environment Variable atau LocalStorage
 */
export function getGeminiApiKey(): string {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    localStorage.getItem('santriva_gemini_api_key') ||
    ''
  );
}

/**
 * Menyimpan API Key Gemini ke LocalStorage pengguna
 */
export function setGeminiApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem('santriva_gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('santriva_gemini_api_key');
  }
}

/**
 * Generator Pesan Cerdas Berbasis Template Dinamis
 * Digunakan sebagai fallback andal jika API key belum diisi atau kuota API habis
 */
export function generateTemplateLaporan({
  santri,
  logs,
  periode,
  portalUrl,
  tone = 'tarbiyah',
  catatanTambahan,
}: LaporanOptions): string {
  const namaSantri = santri.nama_lengkap || 'Ananda';
  const kelas = santri.kelas ? ` (Kelas ${santri.kelas})` : '';
  const asrama = santri.asrama ? ` - Asrama ${santri.asrama}` : '';
  const totalPelanggaran = logs.length;
  const belumDitakzir = logs.filter(l => l.status_tazir !== 'Sudah').length;

  let rincian: string;
  if (totalPelanggaran === 0) {
    rincian = `Alhamdulillah, selama periode *${periode}*, ananda tercatat *sangat disiplin* dan istiqamah tanpa catatan pelanggaran kegiatan pondok.`;
  } else {
    const jenisCount: Record<string, number> = {};
    logs.forEach(l => {
      const nama = l.master_jenis?.nama || l.jenis || 'Kegiatan Terjadwal';
      jenisCount[nama] = (jenisCount[nama] || 0) + 1;
    });

    const ringkasan = Object.entries(jenisCount)
      .map(([nama, count]) => `• ${nama}: ${count} kali`)
      .join('\n');

    const statusTakzirText = belumDitakzir > 0 
      ? `(${belumDitakzir} catatan takziran masih dalam proses penyelesaian)` 
      : '(seluruh takziran pembinaan telah dituntaskan)';

    rincian = `Catatan kedisiplinan ananda selama periode *${periode}* (Total: ${totalPelanggaran} catatan):\n${ringkasan}\n\nStatus: ${statusTakzirText}.`;
  }

  if (tone === 'tarbiyah') {
    return (
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `Kepada Yth. Bapak/Ibu Wali Santri dari ananda *${namaSantri}*${kelas}${asrama},\n\n` +
      `Semoga Bapak/Ibu sekeluarga senantiasa berada dalam lindungan, rahmat, dan keberkahan dari Allah SWT.\n\n` +
      `Kami dari Pengurus Pondok Pesantren Daruttauhid Al-'Alawiyyah Jepara bermaksud menyampaikan laporan berkala kedisiplinan dan absensi ananda:\n\n` +
      `${rincian}\n\n` +
      (catatanTambahan ? `Catatan Pengurus: "${catatanTambahan}"\n\n` : '') +
      `Bapak/Ibu dapat memantau profil lengkap, catatan prestasi, serta rincian kegiatan ananda melalui tautan portal resmi berikut:\n` +
      `${portalUrl}\n\n` +
      `Mari kita senantiasa bergandengan tangan dalam mendidik dan mendoakan ananda agar tumbuh menjadi pribadi yang berilmu, bertakwa, dan berakhlak karimah.\n\n` +
      `Jazakumullahu khairan katsiran atas kerja sama dan kepercayaannya.\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `_Pengurus Bidang Kedisiplinan & Kesantrian_\n` +
      `*Pondok Pesantren Daruttauhid Al-'Alawiyyah Jepara*`
    );
  }

  if (tone === 'tegas') {
    return (
      `Assalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `Pemberitahuan resmi dari Pengurus PP. Daruttauhid Al-'Alawiyyah Jepara kepada Wali Santri ananda *${namaSantri}*${kelas}:\n\n` +
      `Perihal: *Laporan Evaluasi Kedisiplinan & Absensi Periode ${periode}*\n\n` +
      `${rincian}\n\n` +
      (catatanTambahan ? `Catatan Khusus Pengurus: "${catatanTambahan}"\n\n` : '') +
      `Rincian kalender kehadiran dapat diperiksa melalui tautan:\n` +
      `${portalUrl}\n\n` +
      `Mengingat pentingnya kepatuhan tata tertib dalam pembentukan adab santri, kami memohon perhatian khusus dan bimbingan dari Bapak/Ibu agar ananda lebih disiplin ke depannya.\n\n` +
      `Wassalamu'alaikum Warahmatullahi Wabarakatuh.\n\n` +
      `*Pengurus Kesantrian PP. Daruttauhid Jepara*`
    );
  }

  // Nada Formal / Baku
  return (
    `Assalamu'alaikum Wr. Wb.\n\n` +
    `Yth. Bapak/Ibu Wali Santri dari ananda *${namaSantri}*${kelas}${asrama}.\n\n` +
    `Disampaikan laporan rekapitulasi kedisiplinan santri untuk periode *${periode}* sebagai berikut:\n\n` +
    `${rincian}\n\n` +
    (catatanTambahan ? `Catatan Pengurus: "${catatanTambahan}"\n\n` : '') +
    `Tautan Buku Induk & Riwayat Absensi:\n` +
    `${portalUrl}\n\n` +
    `Demikian informasi ini disampaikan. Atas perhatian dan kerja samanya kami ucapkan terima kasih.\n\n` +
    `Wassalamu'alaikum Wr. Wb.\n\n` +
    `*SIM Santriva - PP. Daruttauhid Jepara*`
  );
}

/**
 * Generator Pesan Menggunakan Model Gemini AI
 */
export async function generateAiLaporan(options: LaporanOptions): Promise<string> {
  const apiKey = options.apiKey || getGeminiApiKey();

  // Jika belum ada API key, gunakan generator cerdas bawaan
  if (!apiKey) {
    return generateTemplateLaporan(options);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const totalPelanggaran = options.logs.length;
    const jenisCount: Record<string, number> = {};
    options.logs.forEach(l => {
      const nama = l.master_jenis?.nama || l.jenis || 'Kegiatan';
      jenisCount[nama] = (jenisCount[nama] || 0) + 1;
    });

    const prompt = `Anda adalah asisten cerdas pengurus Pondok Pesantren Daruttauhid Al-'Alawiyyah Jepara yang bertugas membuat pesan WhatsApp resmi kepada Wali Santri.
Tuliskan pesan WhatsApp yang sangat santun, beradab khas pesantren Ahlussunnah wal Jama'ah, penuh kasih sayang (tarbiyah), dan proporsional.

Data Santri:
- Nama Lengkap: ${options.santri.nama_lengkap || 'Ananda'}
- Kelas: ${options.santri.kelas || '-'}
- Asrama: ${options.santri.asrama || '-'}
- Periode Laporan: ${options.periode}
- Jumlah Pelanggaran: ${totalPelanggaran}
- Rincian Pelanggaran: ${totalPelanggaran === 0 ? 'Tidak ada (Sangat Disiplin)' : JSON.stringify(jenisCount)}
- Catatan Tambahan Pengurus: ${options.catatanTambahan || '-'}
- Tautan Portal Santri Resmi: ${options.portalUrl}
- Nada Pesan: ${options.tone || 'tarbiyah (penuh doa & kasih sayang)'}

Ketentuan Format Pesan:
1. Mulai dengan salam lengkap (Assalamu'alaikum Warahmatullahi Wabarakatuh).
2. Sapa Bapak/Ibu Wali Santri dari ananda dengan penuh hormat.
3. Apresiasi santri jika disiplin, atau sampaikan catatan kehadiran secara bijaksana dengan semangat mendidik tanpa menyinggung/menghakimi orang tua.
4. Cantumkan tautan portal santri agar orang tua dapat memverifikasi tanggal dan jenis kegiatan.
5. Jika ada catatan tambahan pengurus, masukkan secara luwes ke dalam konteks pesan.
6. Tutup dengan doa kebaikan untuk masa depan ananda, ucapan terima kasih, salam penutup, dan tanda tangan Pengurus PP Daruttauhid Al-'Alawiyyah Jepara.
7. Format teks menggunakan cetak tebal (*teks*) atau miring (_teks_) sesuai gaya WhatsApp.
8. Berikan HANYA teks isi pesan WhatsApp siap kirim tanpa penjelasan tambahan.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const generatedText = response.text()?.trim();

    if (generatedText) {
      return generatedText;
    }
    return generateTemplateLaporan(options);
  } catch (error: any) {
    console.warn("Gagal menghubungi Gemini AI, beralih ke template dinamis:", error.message);
    return generateTemplateLaporan(options);
  }
}
