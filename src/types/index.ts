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
  tahun_masuk: string | null;
  tahun_keluar: string | null;
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
  catatan?: string;
  created_at: string;
}

export interface MasterRole {
  id: string;
  nama_role: string;
  permissions: string[];
  created_at?: string;
}

export interface Pengguna {
  id: string;
  email: string;
  nama_lengkap: string;
  role_id: string | null;
  usulan_role?: string | null;
  status_akun: 'Menunggu' | 'Aktif' | 'Ditolak';
  created_at?: string;
  master_role?: MasterRole | null;
}

export interface MasterJenis {
  id: string;
  nama: string;
  tipe?: string;
  created_at?: string;
}

export interface LogPelanggaran {
  id: string;
  santri_id: string;
  jenis_id: string;
  tgl_melanggar: string;
  status_tazir: 'Belum' | 'Sudah';
  keterangan?: string | null;
  input_by?: string | null;
  tazir_by?: string | null;
  created_at?: string;
  santri?: Partial<Santri>;
  master_jenis?: Partial<MasterJenis>;
}

export interface PengajuanSantri {
  id: string;
  santri_id?: string | null;
  jenis_pengajuan: 'Baru' | 'Update';
  status_pengajuan: 'Menunggu' | 'Disetujui' | 'Ditolak';
  data_pengajuan: Record<string, any>;
  catatan_admin?: string | null;
  created_at: string;
}

export interface SantriCatatan {
  id: string;
  santri_id: string;
  isi: string;
  created_at: string;
}

export interface SantriPrestasi {
  id: string;
  santri_id: string;
  prestasi: string;
  created_at: string;
}