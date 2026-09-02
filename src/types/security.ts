export type MaskedIdentifier = string;
export type NullableText = string | null;

export type AccountStatus = 'Aktif' | 'Menunggu' | 'Ditolak';
export type ReviewDecision = 'Disetujui' | 'Ditolak';
export type RolePermission =
  | 'akses_induk'
  | 'edit_induk'
  | 'hapus_induk'
  | 'akses_takziran'
  | 'input_takziran'
  | 'validasi_pengajuan'
  | 'kelola_pengguna'
  | 'akses_keuangan';

export interface WaliPortalProfile {
  nama_lengkap: string;
  nis: NullableText;
  nisn: MaskedIdentifier | null;
  nik: MaskedIdentifier | null;
  jenis_kelamin: NullableText;
  tempat_lahir: NullableText;
  tanggal_lahir: NullableText;
  no_hp_santri: MaskedIdentifier | null;
  kelas: NullableText;
  asrama: NullableText;
  status: NullableText;
  tanggal_masuk: NullableText;
  tahun_masuk: NullableText;
  tahun_keluar: NullableText;
  alamat_jalan: NullableText;
  desa_kelurahan: NullableText;
  kecamatan: NullableText;
  kabupaten_kota: NullableText;
  provinsi: NullableText;
  kode_pos: NullableText;
  nama_ayah: NullableText;
  pekerjaan_ayah: NullableText;
  nama_ibu: NullableText;
  pekerjaan_ibu: NullableText;
  nama_wali: NullableText;
  no_hp_wali: MaskedIdentifier | null;
}

export interface WaliPortalViolation {
  jenis: NullableText;
  tanggal: NullableText;
  status_tazir: NullableText;
  keterangan: NullableText;
}

export interface WaliPortalAchievement {
  prestasi: string;
  tanggal: string;
}

export interface WaliPortalNote {
  isi: string;
  tanggal: string;
}

export interface PendingWaliSubmission {
  jenis_pengajuan: string;
  status_pengajuan: string;
  sumber_pengajuan: string;
  created_at: string;
}

export interface WaliPortalResponse {
  profil: WaliPortalProfile;
  pelanggaran: WaliPortalViolation[];
  prestasi: WaliPortalAchievement[];
  catatan: WaliPortalNote[];
  pengajuan_menunggu: PendingWaliSubmission[];
}

export interface PublicSearchResult {
  selection_token: string;
  nama_lengkap: string;
  status: NullableText;
  tahun_masuk: NullableText;
  tahun_keluar: NullableText;
  kelas: NullableText;
  asrama: NullableText;
  desa_kelurahan: NullableText;
  kecamatan: NullableText;
  kabupaten_kota: NullableText;
  total_count: number;
}

export interface MaskedFieldSummary {
  terisi: boolean;
  nilai?: MaskedIdentifier | null;
}

export interface PublicMaskedSummary {
  nama_lengkap: string;
  status: NullableText;
  kelas: NullableText;
  asrama: NullableText;
  tahun_masuk: NullableText;
  tahun_keluar: NullableText;
  desa_kelurahan: NullableText;
  kecamatan: NullableText;
  kabupaten_kota: NullableText;
  ringkasan: {
    nisn: MaskedFieldSummary;
    nik: MaskedFieldSummary;
    jenis_kelamin: MaskedFieldSummary;
    tempat_lahir: MaskedFieldSummary;
    tanggal_lahir: MaskedFieldSummary;
    no_hp_santri: MaskedFieldSummary;
    alamat_jalan: MaskedFieldSummary;
    provinsi: MaskedFieldSummary;
    kode_pos: MaskedFieldSummary;
    nama_ayah: MaskedFieldSummary;
    pekerjaan_ayah: MaskedFieldSummary;
    nama_ibu: MaskedFieldSummary;
    pekerjaan_ibu: MaskedFieldSummary;
    nama_wali: MaskedFieldSummary;
    no_hp_wali: MaskedFieldSummary;
  };
}

export interface PublicClaimant {
  nama_pengaju: string;
  hubungan: string;
  kontak_wa: string;
}

export interface StudentCorrectionPayload {
  nama_lengkap?: NullableText;
  nisn?: NullableText;
  nik?: NullableText;
  jenis_kelamin?: NullableText;
  tempat_lahir?: NullableText;
  tanggal_lahir?: NullableText;
  no_hp_santri?: NullableText;
  kelas?: NullableText;
  asrama?: NullableText;
  status?: NullableText;
  tanggal_masuk?: NullableText;
  tahun_masuk?: NullableText;
  tahun_keluar?: NullableText;
  alamat_jalan?: NullableText;
  desa_kelurahan?: NullableText;
  kecamatan?: NullableText;
  kabupaten_kota?: NullableText;
  provinsi?: NullableText;
  kode_pos?: NullableText;
  nama_ayah?: NullableText;
  pekerjaan_ayah?: NullableText;
  nama_ibu?: NullableText;
  pekerjaan_ibu?: NullableText;
  nama_wali?: NullableText;
  no_hp_wali?: NullableText;
}

export type NewRegistrationPayload = Omit<
  StudentCorrectionPayload,
  | 'kelas'
  | 'asrama'
  | 'status'
  | 'tanggal_masuk'
  | 'tahun_masuk'
  | 'tahun_keluar'
>;

export interface WaliAccessRequest {
  selection_token: string;
  pengaju: PublicClaimant;
}

export interface MyProfileRole {
  nama_role: string;
  permissions: RolePermission[];
}

export interface MyProfile {
  id: string;
  email: string;
  nama_lengkap: string;
  usulan_role: NullableText;
  status_akun: AccountStatus;
  role_id: NullableText;
  role: MyProfileRole | null;
}

export interface TakziranStudentSummary {
  id: string;
  nama_lengkap: string;
  nis: NullableText;
  kelas: NullableText;
  asrama: NullableText;
}

export interface ReviewResult {
  id: string;
  status: ReviewDecision;
  santri_id?: NullableText;
  token?: NullableText;
}
