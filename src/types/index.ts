export interface Santri {
  id: string;
  kode_unik: string;
  nama_lengkap: string;
  nis: string | null;
  nisn: string | null;
  nik: string | null;
  jenis_kelamin: string | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  no_hp_santri: string | null;
  kelas: string | null;
  asrama: string | null;
  status: string;
  tanggal_masuk: string | null;
  tahun_masuk: string | null;        // Kolom baru
  tahun_keluar: string | null;       // Kolom baru
  alamat_jalan: string | null;
  desa_kelurahan: string | null;
  kecamatan: string | null;
  kabupaten_kota: string | null;
  provinsi: string | null;
  kode_pos: string | null;
  nama_ayah: string | null;
  pekerjaan_ayah: string | null;
  nama_ibu: string | null;
  pekerjaan_ibu: string | null;
  nama_wali: string | null;
  no_hp_wali: string | null;
  emis_id?: string | null;
  status_sinkronisasi?: string | null;
  terakhir_sinkron?: string | null;
  created_at: string;
}