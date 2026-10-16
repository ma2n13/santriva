import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Supabase Source (santri-app)
const SRC_SUPABASE_URL = 'https://mqhszwgdnezdaonwhopb.supabase.co';
const SRC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHN6d2dkbmV6ZGFvbndob3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTEzODMsImV4cCI6MjA4NDM2NzM4M30.PezVTA-hIaK88uCDdeWwp49C7Cg44crz3UpGToxtNeU';

export const srcSupabase = createClient(SRC_SUPABASE_URL, SRC_SUPABASE_ANON_KEY);

export function normalizeName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['`’\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Kamus penyesuaian ejaan antara santri-app dan buku induk santriva
export const KNOWN_ALIASES: Record<string, string> = {
  'achmad romatullah asy syahir': 'achmad rochmatullah asy syahir',
  'anugrah nur lillahi akbar': 'anugrah nur lilahi akbar',
  'andan juandistira': 'andan joandistira',
  'lukman amir dalilul khairat': 'lukman amir dalilul khoirot',
  'bagus adi prayoga': 'bagus adi prayogo',
  'muhammad bahij al auzi wahid': 'muhammad bahij al auzai wahid',
  'muhammad rifki nor izdihar': 'muhammad rifki nor izdhihar',
  'muhammad wafi syifa\'ul f': 'muhammad wafi syifa\'ul fudhla',
  'muhammad fikri nasrullah': 'muhammad fikri nashrullah',
  'kholili abdul h': 'muhammad kholili abdul hanif',
  'danil': 'mohammad danil murtadho',
  'dimas aji': 'dimas aji santoso',
  'fajar': 'rio fajar alfath',
  'hilmi': 'muhammad hilmi muwaffaq',
  'fathoni': 'akhmad fathoni',
  'fandi': 'ahmad rifandi julianto',
  'alfa ni\'am': 'mohamad alfan ni\'am',
  'alfan ni\'am': 'mohamad alfan ni\'am',
  'soffan syarofi': 'm. soffan syarofi',
  'muhammad fajar rizal f.': 'muhammad fajar rizal firmansyah',
  'izza': 'muhammad mawahibal izza',
  'zainuri': 'muhammad zainuri',
  'feri': 'muhammad ferizqo azmiansyah',
  'radit': 'haristawidya raditya rabani'
};

export interface SyncProgress {
  step: 'init' | 'santri' | 'logs' | 'catatan' | 'done' | 'error';
  message: string;
  current: number;
  total: number;
  percent: number;
}

export interface SyncStats {
  totalSrcSantri: number;
  matchedSantri: number;
  createdSantri: number;
  updatedTagsCount: number;
  totalLogs: number;
  syncedLogs: number;
  syncedCatatan: number;
  syncedPrestasi: number;
}

/**
 * Parsing labels array dari santri-app menjadi objek { kelas, asrama, extra }
 * Contoh input: ['Kelas 12', 'Wetan'] => kelas: '12', asrama: 'Wetan'
 * Contoh input: ['Kelas 10', 'Kulon', 'Asli Lor'] => kelas: '10', asrama: 'Kulon, Asli Lor'
 */
export function parseLabels(labels: string[] = []): { kelas: string | null; asrama: string | null; allTags: string[] } {
  if (!labels || !Array.isArray(labels)) {
    return { kelas: null, asrama: null, allTags: [] };
  }

  let kelas: string | null = null;
  const dorms: string[] = [];

  labels.forEach(lbl => {
    const trimmed = lbl.trim();
    const matchKelas = trimmed.match(/^kelas\s*(\d+)/i);
    if (matchKelas) {
      kelas = matchKelas[1]; // misal '12', '11', '10', '9', '8', '7'
    } else {
      dorms.push(trimmed);
    }
  });

  return {
    kelas,
    asrama: dorms.length > 0 ? dorms.join(', ') : null,
    allTags: labels
  };
}

/**
 * Eksekusi Sinkronisasi Lengkap
 */
export async function runLegacySync(
  onProgress?: (p: SyncProgress) => void,
  targetClient = supabase
): Promise<SyncStats> {
  const stats: SyncStats = {
    totalSrcSantri: 0,
    matchedSantri: 0,
    createdSantri: 0,
    updatedTagsCount: 0,
    totalLogs: 0,
    syncedLogs: 0,
    syncedCatatan: 0,
    syncedPrestasi: 0
  };

  const report = (p: Partial<SyncProgress>) => {
    if (onProgress) {
      onProgress({
        step: p.step || 'init',
        message: p.message || '',
        current: p.current || 0,
        total: p.total || 0,
        percent: p.total ? Math.round(((p.current || 0) / p.total) * 100) : 0
      });
    }
  };

  report({ step: 'init', message: 'Menghubungkan ke database santri-app & Santriva...', current: 0, total: 100 });

  // 1. Ambil data master_santri dari santri-app
  const { data: srcSantri, error: errSrcSantri } = await srcSupabase.from('master_santri').select('*');
  if (errSrcSantri || !srcSantri) {
    throw new Error('Gagal membaca master_santri dari santri-app: ' + (errSrcSantri?.message || 'Data kosong'));
  }
  stats.totalSrcSantri = srcSantri.length;

  // 2. Ambil seluruh santri dari santriva (dengan paginasi range 1000)
  let allDstSantri: any[] = [];
  let from = 0;
  while (true) {
    const { data: chunk, error: errDst } = await targetClient
      .from('santri')
      .select('id, kode_unik, nama_lengkap, kelas, asrama, status, catatan')
      .range(from, from + 999);
    if (errDst) throw new Error('Gagal membaca santri dari Santriva: ' + errDst.message);
    if (!chunk || chunk.length === 0) break;
    allDstSantri = allDstSantri.concat(chunk);
    if (chunk.length < 1000) break;
    from += 1000;
  }

  // Buat lookup map untuk santri yang sudah ada di Santriva
  const dstByName = new Map<string, any>();
  allDstSantri.forEach(s => {
    dstByName.set(normalizeName(s.nama_lengkap), s);
  });

  // Map untuk menghubungkan Nama di santri-app => santri_id di Santriva
  const nameToSantriId = new Map<string, string>();

  // 3. Sinkronkan Santri Aktif & Tag / Label
  report({ step: 'santri', message: 'Menandai santri aktif & menyalin label...', current: 0, total: srcSantri.length });

  for (let i = 0; i < srcSantri.length; i++) {
    const s = srcSantri[i];
    const norm = normalizeName(s.nama);
    const alias = KNOWN_ALIASES[norm] || KNOWN_ALIASES[s.nama.toLowerCase()];
    const targetNorm = alias ? normalizeName(alias) : norm;

    const { kelas, asrama } = parseLabels(s.labels || []);
    const labelNote = s.labels && s.labels.length > 0 ? `Tag santri-app: ${s.labels.join(', ')}` : null;

    let targetSantri = dstByName.get(targetNorm);

    if (targetSantri) {
      // Santri ditemukan di santriva => Update status menjadi 'Aktif', update kelas & asrama
      const updatePayload: Record<string, any> = {
        status: 'Aktif'
      };
      if (kelas) updatePayload.kelas = kelas;
      if (asrama) updatePayload.asrama = asrama;
      if (labelNote && !targetSantri.catatan) updatePayload.catatan = labelNote;

      const { error: errUpd } = await targetClient
        .from('santri')
        .update(updatePayload)
        .eq('id', targetSantri.id);

      if (errUpd) {
        console.warn(`Gagal update santri ${s.nama}:`, errUpd.message);
      } else {
        stats.matchedSantri++;
        stats.updatedTagsCount++;
      }

      nameToSantriId.set(norm, targetSantri.id);
      nameToSantriId.set(targetNorm, targetSantri.id);
    } else {
      // Santri baru (belum ada di santriva) => Insert sebagai santri baru 'Aktif'
      const kodeUnik = 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
      const insertPayload = {
        kode_unik: kodeUnik,
        nama_lengkap: s.nama.trim(),
        status: 'Aktif',
        kelas: kelas || null,
        asrama: asrama || null,
        catatan: labelNote,
        tanggal_masuk: new Date().toISOString().split('T')[0],
        status_sinkronisasi: 'Migrasi santri-app'
      };

      const { data: newRow, error: errIns } = await targetClient
        .from('santri')
        .insert(insertPayload)
        .select('id')
        .single();

      if (errIns || !newRow) {
        console.warn(`Gagal insert santri baru ${s.nama}:`, errIns?.message);
      } else {
        stats.createdSantri++;
        stats.updatedTagsCount++;
        nameToSantriId.set(norm, newRow.id);
        nameToSantriId.set(targetNorm, newRow.id);
      }
    }

    report({
      step: 'santri',
      message: `Memproses santri (${i + 1}/${srcSantri.length}): ${s.nama}`,
      current: i + 1,
      total: srcSantri.length
    });
  }

  // 4. Sinkronkan Master Jenis Kegiatan
  report({ step: 'logs', message: 'Memeriksa master jenis kegiatan...', current: 0, total: 100 });
  const { data: srcJenis } = await srcSupabase.from('master_jenis').select('*');
  const { data: dstJenis } = await targetClient.from('master_jenis').select('*');

  const dstJenisByName = new Map<string, string>();
  (dstJenis || []).forEach(j => {
    dstJenisByName.set(normalizeName(j.nama), j.id);
    // juga dengan apostrof standar
    dstJenisByName.set(j.nama.toLowerCase().replace(/’/g, "'").trim(), j.id);
  });

  // Pastikan jenis dari src ada di dst
  for (const sj of srcJenis || []) {
    const sjNorm = normalizeName(sj.nama);
    if (!dstJenisByName.has(sjNorm)) {
      const { data: insertedJ } = await targetClient
        .from('master_jenis')
        .insert({ nama: sj.nama.replace(/’/g, "'"), tipe: 'Pelanggaran' })
        .select('id')
        .single();
      if (insertedJ) {
        dstJenisByName.set(sjNorm, insertedJ.id);
      }
    }
  }

  // Tambahkan jenis ekstra yang ada di riwayat logs jika belum terdaftar
  const extraJenis = ['Tandzif', 'Ngaji Ramadhan (Posonan)'];
  for (const ej of extraJenis) {
    const ejNorm = normalizeName(ej);
    if (!dstJenisByName.has(ejNorm)) {
      const { data: insertedJ } = await targetClient
        .from('master_jenis')
        .insert({ nama: ej, tipe: 'Pelanggaran' })
        .select('id')
        .single();
      if (insertedJ) {
        dstJenisByName.set(ejNorm, insertedJ.id);
      }
    }
  }

  // 5. Sinkronkan Logs Pelanggaran & Absensi (9.380 record)
  report({ step: 'logs', message: 'Mengunduh riwayat takziran & absensi dari santri-app...', current: 0, total: 100 });

  // Ambil semua logs_pelanggaran dari santri-app (paginasi per 1000)
  let allSrcLogs: any[] = [];
  let logFrom = 0;
  while (true) {
    const { data: logChunk, error: errLogs } = await srcSupabase
      .from('logs_pelanggaran')
      .select('*')
      .range(logFrom, logFrom + 999);
    if (errLogs) throw new Error('Gagal mengambil logs_pelanggaran: ' + errLogs.message);
    if (!logChunk || logChunk.length === 0) break;
    allSrcLogs = allSrcLogs.concat(logChunk);
    if (logChunk.length < 1000) break;
    logFrom += 1000;
  }

  stats.totalLogs = allSrcLogs.length;
  report({
    step: 'logs',
    message: `Total ${allSrcLogs.length} riwayat takziran siap disalin. Memulai pengiriman data...`,
    current: 0,
    total: allSrcLogs.length
  });

  // Batch insert logs ke santriva (chunk 250 record)
  const CHUNK_SIZE = 250;
  for (let i = 0; i < allSrcLogs.length; i += CHUNK_SIZE) {
    const chunk = allSrcLogs.slice(i, i + CHUNK_SIZE);
    const validRows: any[] = [];

    chunk.forEach(l => {
      const normLogName = normalizeName(l.nama);
      const alias = KNOWN_ALIASES[normLogName] || KNOWN_ALIASES[l.nama.toLowerCase()];
      const sId = nameToSantriId.get(alias ? normalizeName(alias) : normLogName);

      const jName = l.jenis || '';
      const jId = dstJenisByName.get(normalizeName(jName)) || dstJenisByName.get(jName.toLowerCase().replace(/’/g, "'").trim());

      // Format tanggal
      let cleanDate: string;
      if (l.tglMelanggar && typeof l.tglMelanggar === 'object' && l.tglMelanggar.seconds) {
        cleanDate = new Date(l.tglMelanggar.seconds * 1000).toISOString().split('T')[0];
      } else if (typeof l.tglMelanggar === 'string' && l.tglMelanggar.includes('-')) {
        cleanDate = l.tglMelanggar.substring(0, 10);
      } else {
        cleanDate = new Date().toISOString().split('T')[0];
      }

      if (sId && jId) {
        validRows.push({
          santri_id: sId,
          jenis_id: jId,
          tgl_melanggar: cleanDate,
          status_tazir: l.statusTazir === 'Sudah' ? 'Sudah' : 'Belum',
          keterangan: l.keterangan || null,
          input_by: l.inputBy || 'Migrasi santri-app',
          tazir_by: l.tazirBy || (l.statusTazir === 'Sudah' ? 'Migrasi' : null),
          created_at: l.createdAt || new Date().toISOString()
        });
      }
    });

    if (validRows.length > 0) {
      const { error: errInsertBatch } = await targetClient.from('log_pelanggaran').insert(validRows);
      if (errInsertBatch) {
        console.error('Error batch insert log_pelanggaran:', errInsertBatch);
      } else {
        stats.syncedLogs += validRows.length;
      }
    }

    report({
      step: 'logs',
      message: `Menyalin log takziran (${Math.min(i + CHUNK_SIZE, allSrcLogs.length)} / ${allSrcLogs.length})...`,
      current: Math.min(i + CHUNK_SIZE, allSrcLogs.length),
      total: allSrcLogs.length
    });
  }

  // 6. Sinkronkan santri_catatan (24 record)
  report({ step: 'catatan', message: 'Menyalin catatan santri...', current: 0, total: 100 });
  const { data: srcCatatan } = await srcSupabase.from('santri_catatan').select('*');
  if (srcCatatan && srcCatatan.length > 0) {
    const validCatatan: any[] = [];
    srcCatatan.forEach(c => {
      // Abaikan catatan sistem bot WA
      if (c.nama === 'SYSTEM_WA') return;
      const sId = nameToSantriId.get(normalizeName(c.nama));
      if (sId && c.isi) {
        validCatatan.push({
          santri_id: sId,
          isi: c.isi,
          created_at: c.createdAt || c.createdat || new Date().toISOString()
        });
      }
    });
    if (validCatatan.length > 0) {
      const { error: errCat } = await targetClient.from('santri_catatan').insert(validCatatan);
      if (!errCat) stats.syncedCatatan = validCatatan.length;
    }
  }

  // 7. Sinkronkan santri_prestasi (52 record)
  report({ step: 'catatan', message: 'Menyalin data prestasi santri...', current: 50, total: 100 });
  const { data: srcPrestasi } = await srcSupabase.from('santri_prestasi').select('*');
  if (srcPrestasi && srcPrestasi.length > 0) {
    const validPrestasi: any[] = [];
    srcPrestasi.forEach(p => {
      const sId = nameToSantriId.get(normalizeName(p.nama));
      if (sId && p.prestasi) {
        validPrestasi.push({
          santri_id: sId,
          prestasi: p.prestasi,
          created_at: p.createdAt || new Date().toISOString()
        });
      }
    });
    if (validPrestasi.length > 0) {
      const { error: errPres } = await targetClient.from('santri_prestasi').insert(validPrestasi);
      if (!errPres) stats.syncedPrestasi = validPrestasi.length;
    }
  }

  report({
    step: 'done',
    message: `Sinkronisasi selesai! ${stats.matchedSantri + stats.createdSantri} santri aktif & ${stats.syncedLogs} riwayat berhasil disalin.`,
    current: 100,
    total: 100
  });

  return stats;
}
