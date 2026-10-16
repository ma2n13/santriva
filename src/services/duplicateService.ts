import { supabase } from '../lib/supabase';
import { formatSantriName, normalizeName } from '../utils/nameFormat';
import type { Santri } from '../types';

export interface DuplicateItem {
  santri: Santri;
  logsCount: number;
  catatanCount: number;
  prestasiCount: number;
  tagihanCount: number;
}

export interface DuplicateGroup {
  normalizedName: string;
  displayName: string;
  items: DuplicateItem[];
  hasActive: boolean;
}

/**
 * Mencari seluruh data santri yang memiliki nama sama (dobel)
 */
export async function findDuplicateSantri(targetClient = supabase): Promise<DuplicateGroup[]> {
  // 1. Ambil seluruh data santri dengan paginasi
  let allSantri: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await targetClient
      .from('santri')
      .select('*')
      .range(from, from + 999);
    if (error) throw new Error('Gagal memuat data santri: ' + error.message);
    if (!data || data.length === 0) break;
    allSantri = allSantri.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // 2. Kelompokkan berdasarkan nama yang dinormalisasi
  const byNorm = new Map<string, any[]>();
  allSantri.forEach(s => {
    const norm = normalizeName(s.nama_lengkap);
    if (!byNorm.has(norm)) byNorm.set(norm, []);
    byNorm.get(norm)!.push(s);
  });

  const rawGroups: Array<{ norm: string; items: any[] }> = [];
  for (const [norm, group] of byNorm.entries()) {
    if (group.length > 1) {
      rawGroups.push({ norm, items: group });
    }
  }

  // 3. Untuk setiap kelompok dobel, hitung riwayat log, catatan, prestasi, dan tagihan
  const duplicateGroups: DuplicateGroup[] = [];

  for (const group of rawGroups) {
    const items: DuplicateItem[] = [];
    let hasActive = false;

    for (const santri of group.items) {
      if (santri.status === 'Aktif') hasActive = true;

      // Hitung relasi data secara paralel
      const [logsRes, catatanRes, prestasiRes, tagihanRes] = await Promise.all([
        targetClient.from('log_pelanggaran').select('id', { count: 'exact', head: true }).eq('santri_id', santri.id),
        targetClient.from('santri_catatan').select('id', { count: 'exact', head: true }).eq('santri_id', santri.id),
        targetClient.from('santri_prestasi').select('id', { count: 'exact', head: true }).eq('santri_id', santri.id),
        targetClient.from('santri_tagihan').select('id', { count: 'exact', head: true }).eq('santri_id', santri.id)
      ]);

      items.push({
        santri,
        logsCount: logsRes.count || 0,
        catatanCount: catatanRes.count || 0,
        prestasiCount: prestasiRes.count || 0,
        tagihanCount: tagihanRes.count || 0
      });
    }

    // Urutkan item: yang punya riwayat terbanyak atau status 'Aktif' di urutan teratas sebagai rekomendasi
    items.sort((a, b) => {
      const scoreA = (a.santri.status === 'Aktif' ? 1000 : 0) + a.logsCount + a.catatanCount + a.prestasiCount;
      const scoreB = (b.santri.status === 'Aktif' ? 1000 : 0) + b.logsCount + b.catatanCount + b.prestasiCount;
      return scoreB - scoreA;
    });

    duplicateGroups.push({
      normalizedName: group.norm,
      displayName: formatSantriName(items[0].santri.nama_lengkap),
      items,
      hasActive
    });
  }

  // Urutkan grup: yang memiliki santri Aktif ditaruh paling atas
  duplicateGroups.sort((a, b) => {
    if (a.hasActive && !b.hasActive) return -1;
    if (!a.hasActive && b.hasActive) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return duplicateGroups;
}

/**
 * Menggabungkan data santri duplikat (duplicateId) ke dalam data utama (primaryId)
 */
export async function mergeSantri(
  primaryId: string,
  duplicateId: string,
  targetClient = supabase
): Promise<{ success: boolean; message: string }> {
  if (primaryId === duplicateId) {
    throw new Error('Data utama dan data duplikat tidak boleh sama.');
  }

  // 1. Ambil detail kedua santri
  const [{ data: primary }, { data: duplicate }] = await Promise.all([
    targetClient.from('santri').select('*').eq('id', primaryId).single(),
    targetClient.from('santri').select('*').eq('id', duplicateId).single()
  ]);

  if (!primary || !duplicate) {
    throw new Error('Salah satu data santri tidak ditemukan.');
  }

  // 2. Alihkan seluruh relasi data dari duplicate ke primary
  const [updLogs, updCatatan, updPrestasi, updTagihan] = await Promise.all([
    targetClient.from('log_pelanggaran').update({ santri_id: primaryId }).eq('santri_id', duplicateId),
    targetClient.from('santri_catatan').update({ santri_id: primaryId }).eq('santri_id', duplicateId),
    targetClient.from('santri_prestasi').update({ santri_id: primaryId }).eq('santri_id', duplicateId),
    targetClient.from('santri_tagihan').update({ santri_id: primaryId }).eq('santri_id', duplicateId)
  ]);

  if (updLogs.error) console.warn('Peringatan saat update logs:', updLogs.error.message);
  if (updCatatan.error) console.warn('Peringatan saat update catatan:', updCatatan.error.message);
  if (updPrestasi.error) console.warn('Peringatan saat update prestasi:', updPrestasi.error.message);
  if (updTagihan.error) console.warn('Peringatan saat update tagihan:', updTagihan.error.message);

  // 3. Lengkapi data utama jika ada kolom yang kosong di data utama tetapi ada di duplikat
  const updatePrimaryPayload: Record<string, any> = {
    nama_lengkap: formatSantriName(primary.nama_lengkap)
  };

  if (!primary.kelas && duplicate.kelas) updatePrimaryPayload.kelas = duplicate.kelas;
  if (!primary.asrama && duplicate.asrama) updatePrimaryPayload.asrama = duplicate.asrama;
  if (!primary.nis && duplicate.nis) updatePrimaryPayload.nis = duplicate.nis;
  if (!primary.nisn && duplicate.nisn) updatePrimaryPayload.nisn = duplicate.nisn;
  if (!primary.nik && duplicate.nik) updatePrimaryPayload.nik = duplicate.nik;
  if (!primary.no_hp_wali && duplicate.no_hp_wali) updatePrimaryPayload.no_hp_wali = duplicate.no_hp_wali;
  if (!primary.no_hp_santri && duplicate.no_hp_santri) updatePrimaryPayload.no_hp_santri = duplicate.no_hp_santri;
  if (!primary.alamat_jalan && duplicate.alamat_jalan) updatePrimaryPayload.alamat_jalan = duplicate.alamat_jalan;

  // Jika salah satu aktif, pastikan data utama berstatus Aktif
  if (duplicate.status === 'Aktif' || primary.status === 'Aktif') {
    updatePrimaryPayload.status = 'Aktif';
  }

  // Gabungkan catatan jika ada
  if (duplicate.catatan && duplicate.catatan !== primary.catatan) {
    updatePrimaryPayload.catatan = [primary.catatan, duplicate.catatan].filter(Boolean).join(' | ');
  }

  await targetClient.from('santri').update(updatePrimaryPayload).eq('id', primaryId);

  // 4. Hapus data duplikat yang sudah digabungkan
  const { error: errDel } = await targetClient.from('santri').delete().eq('id', duplicateId);
  if (errDel) {
    throw new Error('Gagal menghapus rekaman duplikat: ' + errDel.message);
  }

  return {
    success: true,
    message: `Berhasil menggabungkan data santri "${formatSantriName(primary.nama_lengkap)}". Seluruh riwayat & tagihan telah dipindahkan ke data utama.`
  };
}

/**
 * Menghapus santri duplikat (opsional hapus relasi jika ada)
 */
export async function deleteDuplicateSantri(
  santriId: string,
  deleteRelations = true,
  targetClient = supabase
): Promise<{ success: boolean; message: string }> {
  if (deleteRelations) {
    await Promise.all([
      targetClient.from('log_pelanggaran').delete().eq('santri_id', santriId),
      targetClient.from('santri_catatan').delete().eq('santri_id', santriId),
      targetClient.from('santri_prestasi').delete().eq('santri_id', santriId),
      targetClient.from('santri_tagihan').delete().eq('santri_id', santriId)
    ]);
  }

  const { error } = await targetClient.from('santri').delete().eq('id', santriId);
  if (error) {
    throw new Error('Gagal menghapus santri: ' + error.message);
  }

  return {
    success: true,
    message: 'Data santri berhasil dihapus.'
  };
}

/**
 * Menstandarisasikan seluruh nama santri di database menjadi Title Case (Contoh: "Ahmad Said")
 */
export async function standardizeAllDatabaseNames(
  onProgress?: (current: number, total: number, currentName: string) => void,
  targetClient = supabase
): Promise<{ totalChecked: number; totalUpdated: number }> {
  // 1. Ambil semua santri
  let allSantri: any[] = [];
  let from = 0;
  while (true) {
    const { data } = await targetClient.from('santri').select('id, nama_lengkap').range(from, from + 999);
    if (!data || data.length === 0) break;
    allSantri = allSantri.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // 2. Filter yang format namanya belum standar
  const needsUpdate = allSantri.filter(s => {
    const formatted = formatSantriName(s.nama_lengkap);
    return s.nama_lengkap !== formatted;
  });

  let updatedCount = 0;
  for (let i = 0; i < needsUpdate.length; i++) {
    const s = needsUpdate[i];
    const newName = formatSantriName(s.nama_lengkap);

    const { error } = await targetClient
      .from('santri')
      .update({ nama_lengkap: newName })
      .eq('id', s.id);

    if (!error) updatedCount++;

    if (onProgress) {
      onProgress(i + 1, needsUpdate.length, newName);
    }
  }

  return {
    totalChecked: allSantri.length,
    totalUpdated: updatedCount
  };
}
