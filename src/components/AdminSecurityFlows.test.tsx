import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { FormPendaftaranAkun } from '../App';
import AdminReview from './AdminReview';
import PengaturanSistem from './PengaturanSistem';
import SantriPage, { WaliAccessPanel } from './SantriPage';
import TakziranDashboard from './TakziranDashboard';
import type { Santri } from '../types';

const api = vi.hoisted(() => ({
  deleteRole: vi.fn(),
  getMyProfile: vi.fn(),
  getOrCreateWaliToken: vi.fn(),
  getTakziranStudents: vi.fn(),
  listRegistrationRoles: vi.fn(),
  registerMyProfile: vi.fn(),
  reviewSubmission: vi.fn(),
  reviewWaliAccessRequest: vi.fn(),
  rotateWaliToken: vi.fn(),
  saveRole: vi.fn(),
  setWaliAccessStatus: vi.fn(),
  updateUser: vi.fn(),
}));

const database = vi.hoisted(() => ({
  counts: {} as Record<string, number>,
  from: vi.fn(),
  mutations: [] as Array<{ table: string; operation: string }>,
  rows: {} as Record<string, unknown[]>,
}));

vi.mock('../lib/securityApi', () => api);
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    from: database.from,
  },
}));

function createQueryBuilder(table: string) {
  const builder = {
    delete: vi.fn(() => {
      database.mutations.push({ table, operation: 'delete' });
      return builder;
    }),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    insert: vi.fn(() => {
      database.mutations.push({ table, operation: 'insert' });
      return builder;
    }),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    select: vi.fn(() => builder),
    update: vi.fn(() => {
      database.mutations.push({ table, operation: 'update' });
      return builder;
    }),
    then: (
      resolve: (value: { data: unknown[]; count: number; error: null }) => unknown,
    ) => Promise.resolve({
      data: database.rows[table] ?? [],
      count: database.counts[table] ?? (database.rows[table]?.length ?? 0),
      error: null,
    }).then(resolve),
  };
  return builder;
}

const student: Santri = {
  id: '11111111-1111-4111-8111-111111111111',
  kode_unik: 'LEGACY',
  nama_lengkap: 'Ahmad Aman',
  nis: '1001',
  nisn: null,
  nik: null,
  jenis_kelamin: 'Laki-laki',
  tempat_lahir: null,
  tanggal_lahir: null,
  no_hp_santri: null,
  kelas: '1A',
  asrama: 'Al-Falah',
  status: 'Aktif',
  tanggal_masuk: null,
  tahun_masuk: '2026',
  tahun_keluar: null,
  alamat_jalan: null,
  desa_kelurahan: null,
  kecamatan: null,
  kabupaten_kota: null,
  provinsi: null,
  kode_pos: null,
  nama_ayah: null,
  pekerjaan_ayah: null,
  nama_ibu: null,
  pekerjaan_ibu: null,
  nama_wali: null,
  no_hp_wali: null,
  created_at: '2026-08-26T00:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  database.rows = {};
  database.counts = {};
  database.mutations = [];
  database.from.mockImplementation((table: string) => createQueryBuilder(table));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

describe('akun pengguna', () => {
  it('mengambil pilihan role dan mendaftarkan profil melalui RPC', async () => {
    api.listRegistrationRoles.mockResolvedValue([{ nama_role: 'Petugas Takziran' }]);
    api.registerMyProfile.mockResolvedValue({});
    const onRegistered = vi.fn();

    render(
      <FormPendaftaranAkun
        user={{ email: 'petugas@example.com', user_metadata: { full_name: 'Petugas Baru' } }}
        onRegistered={onRegistered}
      />,
    );

    fireEvent.change(await screen.findByLabelText('Role / Posisi yang Diminta'), {
      target: { value: 'Petugas Takziran' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim Pengajuan Akses' }));

    await waitFor(() => expect(onRegistered).toHaveBeenCalled());
    expect(api.registerMyProfile).toHaveBeenCalledWith('Petugas Baru', 'Petugas Takziran');
    expect(database.from).not.toHaveBeenCalledWith('pengguna');
    expect(database.from).not.toHaveBeenCalledWith('master_role');
  });
});

describe('buku induk dan token wali', () => {
  it('menyembunyikan penghapusan tanpa permission hapus_induk', async () => {
    database.rows.santri = [student];
    render(<MemoryRouter><SantriPage permissions={['akses_induk', 'edit_induk']} /></MemoryRouter>);

    const row = await screen.findByRole('row', { name: /Ahmad Aman/ });
    fireEvent.click(within(row).getByRole('checkbox'));

    expect(screen.queryByRole('button', { name: 'Hapus data terpilih' })).not.toBeInTheDocument();
  });

  it('menampilkan penghapusan hanya dengan permission hapus_induk', async () => {
    database.rows.santri = [student];
    render(<MemoryRouter><SantriPage permissions={['akses_induk', 'hapus_induk']} /></MemoryRouter>);

    const row = await screen.findByRole('row', { name: /Ahmad Aman/ });
    fireEvent.click(within(row).getByRole('checkbox'));

    expect(screen.getByRole('button', { name: 'Hapus data terpilih' })).toBeInTheDocument();
  });

  it('mematikan tautan lama setelah konfirmasi rotasi', async () => {
    api.getOrCreateWaliToken.mockResolvedValue('7KMP4XQ9WD');
    api.rotateWaliToken.mockResolvedValue('8NQR5YS2CE');
    render(<WaliAccessPanel santriId={student.id} namaSantri={student.nama_lengkap} canEdit />);

    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan tautan' }));
    expect(await screen.findByText(/7KMP4XQ9WD/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Buat ulang tautan' }));

    expect(await screen.findByText(/tautan lama tidak berlaku/i)).toBeInTheDocument();
    expect(screen.getByText(/8NQR5YS2CE/)).toBeInTheDocument();
  });

  it('menonaktifkan akses tanpa menghapus santri', async () => {
    api.setWaliAccessStatus.mockResolvedValue(true);
    render(<WaliAccessPanel santriId={student.id} namaSantri={student.nama_lengkap} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan akses' }));

    expect(await screen.findByText(/tanpa menghapus data santri/i)).toBeInTheDocument();
    expect(api.setWaliAccessStatus).toHaveBeenCalledWith(student.id, false);
    expect(database.mutations).not.toContainEqual({ table: 'santri', operation: 'delete' });
  });
});

describe('review admin', () => {
  it('menyetujui pengajuan melalui satu RPC atomik', async () => {
    database.rows.pengajuan_santri = [{
      id: '22222222-2222-4222-8222-222222222222',
      santri_id: null,
      jenis_pengajuan: 'Baru',
      status_pengajuan: 'Menunggu',
      sumber_pengajuan: 'pendaftaran_publik',
      informasi_pengaju: { nama_pengaju: 'Wali Ahmad', hubungan: 'Ayah', kontak_wa: '0812' },
      data_pengajuan: { nama_lengkap: 'Ahmad Baru' },
      created_at: '2026-08-26T00:00:00Z',
    }];
    api.reviewSubmission.mockResolvedValue({ id: 'submission', status: 'Disetujui' });
    render(<MemoryRouter><AdminReview permissions={['validasi_pengajuan']} /></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: /Ahmad Baru/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Setujui pengajuan' }));

    expect(await screen.findByText(/pengajuan berhasil disetujui/i)).toBeInTheDocument();
    expect(api.reviewSubmission).toHaveBeenCalledTimes(1);
    expect(database.mutations).toEqual([]);
  });
});

describe('takziran', () => {
  it('hanya menerima ringkasan santri tanpa nomor wali', async () => {
    api.getTakziranStudents.mockResolvedValue([{ ...student, no_hp_wali: '081234567890' }]);
    database.rows.master_jenis = [];
    database.rows.log_pelanggaran = [];
    render(<TakziranDashboard />);

    expect(await screen.findByText('Ahmad Aman')).toBeInTheDocument();
    expect(screen.queryByText('081234567890')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /WhatsApp wali/i })).not.toBeInTheDocument();
    expect(api.getTakziranStudents).toHaveBeenCalledWith(null);
  });
});

describe('pengaturan sistem', () => {
  it('menampilkan penolakan backend saat Super Admin terakhir akan dinonaktifkan', async () => {
    database.rows.master_role = [{
      id: 'role-super',
      nama_role: 'Super Admin',
      permissions: ['kelola_pengguna'],
    }];
    database.rows.pengguna = [{
      id: 'user-super',
      email: 'admin@example.com',
      nama_lengkap: 'Admin Utama',
      usulan_role: null,
      status_akun: 'Aktif',
      role_id: 'role-super',
      master_role: { nama_role: 'Super Admin' },
    }];
    api.updateUser.mockRejectedValue(new Error('Super Admin aktif terakhir tidak dapat dinonaktifkan.'));
    render(<PengaturanSistem />);

    fireEvent.click(screen.getByRole('button', { name: 'Validasi Akun Pengguna' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Tolak akses Admin Utama' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Super Admin aktif terakhir tidak dapat dinonaktifkan.');
    expect(database.mutations).toEqual([]);
  });

  it('menyediakan permission hapus_induk sebagai pilihan terpisah', async () => {
    database.rows.master_role = [];
    database.rows.pengguna = [];
    render(<PengaturanSistem />);
    fireEvent.click(await screen.findByRole('button', { name: 'Buat Role Baru' }));
    expect(screen.getByLabelText('Menghapus Data Santri')).toBeInTheDocument();
  });
});
