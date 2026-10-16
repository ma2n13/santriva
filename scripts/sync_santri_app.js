/**
 * Script CLI untuk Menjalankan Migrasi Data dari santri-app ke Santriva
 * Penggunaan:
 *   node scripts/sync_santri_app.js [SERVICE_ROLE_KEY_OR_ACCESS_TOKEN]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SRC_URL = 'https://mqhszwgdnezdaonwhopb.supabase.co';
const SRC_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaHN6d2dkbmV6ZGFvbndob3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3OTEzODMsImV4cCI6MjA4NDM2NzM4M30.PezVTA-hIaK88uCDdeWwp49C7Cg44crz3UpGToxtNeU';

const DST_URL = process.env.VITE_SUPABASE_URL || 'https://ubhvbkuwvzxaefcmuoas.supabase.co';
const DST_KEY =
  process.argv[2] ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHZia3V3dnp4YWVmY211b2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODg0OTEsImV4cCI6MjA5OTk2NDQ5MX0.peQ7fALn_yAnmPQjsV2Xavoe4iux5-Iz-5Om8fViPXA';

const srcSupabase = createClient(SRC_URL, SRC_ANON_KEY);
const dstSupabase = createClient(DST_URL, DST_KEY);

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['`’\.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const KNOWN_ALIASES = {
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

function parseLabels(labels = []) {
  if (!labels || !Array.isArray(labels)) return { kelas: null, asrama: null };
  let kelas = null;
  const dorms = [];
  labels.forEach(lbl => {
    const trimmed = lbl.trim();
    const matchKelas = trimmed.match(/^kelas\s*(\d+)/i);
    if (matchKelas) {
      kelas = matchKelas[1];
    } else {
      dorms.push(trimmed);
    }
  });
  return {
    kelas,
    asrama: dorms.length > 0 ? dorms.join(', ') : null
  };
}

async function main() {
  console.log('=== MEMULAI SINKRONISASI ABSENSI & TAKZIRAN DARI SANTRI-APP ===');
  console.log('Source URL:', SRC_URL);
  console.log('Target URL:', DST_URL);

  // 1. Ambil master_santri
  console.log('\n[1/4] Mengambil 120 santri dari santri-app...');
  const { data: srcSantri, error: errSrc } = await srcSupabase.from('master_santri').select('*');
  if (errSrc) throw errSrc;
  console.log(`Berhasil mengambil ${srcSantri.length} santri dari santri-app.`);

  // 2. Ambil master_santri di santriva
  let allDst = [];
  let from = 0;
  while (true) {
    const { data: chunk } = await dstSupabase.from('santri').select('id, nama_lengkap, kelas, asrama, status, catatan').range(from, from + 999);
    if (!chunk || chunk.length === 0) break;
    allDst = allDst.concat(chunk);
    if (chunk.length < 1000) break;
    from += 1000;
  }
  console.log(`Terdapat ${allDst.length} data santri di database Santriva.`);

  const dstByName = new Map();
  allDst.forEach(s => dstByName.set(normalizeName(s.nama_lengkap), s));
  const nameToId = new Map();

  let matched = 0;
  let created = 0;

  console.log('\n[2/4] Menandai santri aktif & memperbarui label kelas/asrama...');
  for (const s of srcSantri) {
    const norm = normalizeName(s.nama);
    const alias = KNOWN_ALIASES[norm] || KNOWN_ALIASES[s.nama.toLowerCase()];
    const targetNorm = alias ? normalizeName(alias) : norm;

    const { kelas, asrama } = parseLabels(s.labels);
    const target = dstByName.get(targetNorm);

    if (target) {
      const updateData = { status: 'Aktif' };
      if (kelas) updateData.kelas = kelas;
      if (asrama) updateData.asrama = asrama;
      if (s.labels && s.labels.length > 0 && !target.catatan) {
        updateData.catatan = 'Tag santri-app: ' + s.labels.join(', ');
      }

      await dstSupabase.from('santri').update(updateData).eq('id', target.id);
      nameToId.set(norm, target.id);
      nameToId.set(targetNorm, target.id);
      matched++;
    } else {
      const kodeUnik = 'STR-' + Math.random().toString(36).substring(2, 8).toUpperCase() + Date.now().toString(36).slice(-3).toUpperCase();
      const insertData = {
        kode_unik: kodeUnik,
        nama_lengkap: s.nama.trim(),
        status: 'Aktif',
        kelas: kelas || null,
        asrama: asrama || null,
        catatan: s.labels && s.labels.length > 0 ? 'Tag santri-app: ' + s.labels.join(', ') : null,
        tanggal_masuk: new Date().toISOString().split('T')[0],
        status_sinkronisasi: 'Migrasi santri-app'
      };

      const { data: newRow } = await dstSupabase.from('santri').insert(insertData).select('id').single();
      if (newRow) {
        nameToId.set(norm, newRow.id);
        nameToId.set(targetNorm, newRow.id);
        created++;
      }
    }
  }

  console.log(`Santri dicocokkan: ${matched}`);
  console.log(`Santri baru ditambahkan: ${created}`);

  // 3. Jenis Pelanggaran
  console.log('\n[3/4] Menyelaraskan master jenis pelanggaran & kegiatan...');
  const { data: dstJenis } = await dstSupabase.from('master_jenis').select('*');
  const jenisMap = new Map();
  (dstJenis || []).forEach(j => {
    jenisMap.set(normalizeName(j.nama), j.id);
    jenisMap.set(j.nama.toLowerCase().replace(/’/g, "'").trim(), j.id);
  });

  const extraJenis = ['Tandzif', 'Ngaji Ramadhan (Posonan)'];
  for (const ej of extraJenis) {
    if (!jenisMap.has(normalizeName(ej))) {
      const { data: insJ } = await dstSupabase.from('master_jenis').insert({ nama: ej, tipe: 'Pelanggaran' }).select('id').single();
      if (insJ) jenisMap.set(normalizeName(ej), insJ.id);
    }
  }

  // 4. Salin Logs Pelanggaran
  console.log('\n[4/4] Mengambil & menyalin riwayat log pelanggaran (9.380 record)...');
  let allLogs = [];
  let logFrom = 0;
  while (true) {
    const { data: chunk, error } = await srcSupabase.from('logs_pelanggaran').select('*').range(logFrom, logFrom + 999);
    if (error) throw error;
    if (!chunk || chunk.length === 0) break;
    allLogs = allLogs.concat(chunk);
    if (chunk.length < 1000) break;
    logFrom += 1000;
  }
  console.log(`Diunduh ${allLogs.length} riwayat pelanggaran.`);

  let insertedLogs = 0;
  const CHUNK_SIZE = 250;
  for (let i = 0; i < allLogs.length; i += CHUNK_SIZE) {
    const chunk = allLogs.slice(i, i + CHUNK_SIZE);
    const validRows = [];

    chunk.forEach(l => {
      const normLogName = normalizeName(l.nama);
      const alias = KNOWN_ALIASES[normLogName] || KNOWN_ALIASES[l.nama.toLowerCase()];
      const sId = nameToId.get(alias ? normalizeName(alias) : normLogName);

      const jName = l.jenis || '';
      const jId = jenisMap.get(normalizeName(jName)) || jenisMap.get(jName.toLowerCase().replace(/’/g, "'").trim());

      let cleanDate;
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
      const { error: errBatch } = await dstSupabase.from('log_pelanggaran').insert(validRows);
      if (errBatch) {
        console.error('Error insert batch:', errBatch.message);
      } else {
        insertedLogs += validRows.length;
      }
    }
    process.stdout.write(`\rProgress: ${insertedLogs} / ${allLogs.length} logs tersalin...`);
  }

  // 5. Catatan & Prestasi
  console.log('\n\nMenyalin catatan dan prestasi...');
  const { data: srcCatatan } = await srcSupabase.from('santri_catatan').select('*');
  if (srcCatatan) {
    const validC = [];
    srcCatatan.forEach(c => {
      if (c.nama === 'SYSTEM_WA') return;
      const sId = nameToId.get(normalizeName(c.nama));
      if (sId && c.isi) {
        validC.push({
          santri_id: sId,
          isi: c.isi,
          created_at: c.createdAt || c.createdat || new Date().toISOString()
        });
      }
    });
    if (validC.length > 0) await dstSupabase.from('santri_catatan').insert(validC);
    console.log(`Catatan santri tersalin: ${validC.length}`);
  }

  const { data: srcPrestasi } = await srcSupabase.from('santri_prestasi').select('*');
  if (srcPrestasi) {
    const validP = [];
    srcPrestasi.forEach(p => {
      const sId = nameToId.get(normalizeName(p.nama));
      if (sId && p.prestasi) {
        validP.push({
          santri_id: sId,
          prestasi: p.prestasi,
          created_at: p.createdAt || new Date().toISOString()
        });
      }
    });
    if (validP.length > 0) await dstSupabase.from('santri_prestasi').insert(validP);
    console.log(`Prestasi santri tersalin: ${validP.length}`);
  }

  console.log('\n========================================');
  console.log(' SINKRONISASI SUKSES SEPENUHNYA!');
  console.log(` - Santri Aktif & Label: ${matched + created}`);
  console.log(` - Log Riwayat Pelanggaran: ${insertedLogs}`);
  console.log('========================================');
}

main().catch(err => {
  console.error('\nSinkronisasi Gagal:', err);
  process.exit(1);
});
