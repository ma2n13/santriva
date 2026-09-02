import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CekDataPublik from './CekDataPublik';
import PortalSantri from './PortalSantri';
import PublicPendaftaran from './PublicPendaftaran';
import type {
  PublicMaskedSummary,
  PublicSearchResult,
  WaliPortalResponse,
} from '../types/security';

const api = vi.hoisted(() => ({
  getPublicStudentSummary: vi.fn(),
  getWaliPortal: vi.fn(),
  requestWaliAccess: vi.fn(),
  searchPublicStudents: vi.fn(),
  submitNewRegistration: vi.fn(),
  submitPublicCorrection: vi.fn(),
  submitWaliCorrection: vi.fn(),
}));

vi.mock('../lib/securityApi', () => api);

const searchResult: PublicSearchResult & { alamat_jalan: string } = {
  selection_token: '11111111-1111-4111-8111-111111111111',
  nama_lengkap: 'Ali Mustofa',
  status: 'Alumni/Lulus',
  tahun_masuk: '1985',
  tahun_keluar: '1991',
  kelas: null,
  asrama: 'Al-Falah',
  desa_kelurahan: 'Langon',
  kecamatan: 'Tahunan',
  kabupaten_kota: 'Jepara',
  alamat_jalan: 'Jalan Mawar RT 03 RW 02',
  total_count: 41,
};

const emptyMaskedField = { terisi: false, nilai: null };
const maskedSummary: PublicMaskedSummary = {
  nama_lengkap: 'Ali Mustofa',
  status: 'Alumni/Lulus',
  kelas: null,
  asrama: 'Al-Falah',
  tahun_masuk: '1985',
  tahun_keluar: '1991',
  desa_kelurahan: 'Langon',
  kecamatan: 'Tahunan',
  kabupaten_kota: 'Jepara',
  ringkasan: {
    nisn: emptyMaskedField,
    nik: { terisi: true, nilai: '33••••1234' },
    jenis_kelamin: { terisi: true, nilai: 'Laki-laki' },
    tempat_lahir: { terisi: true, nilai: 'Jepara' },
    tanggal_lahir: { terisi: true, nilai: '••-••-1970' },
    no_hp_santri: emptyMaskedField,
    alamat_jalan: { terisi: true, nilai: 'Dukuh ******' },
    provinsi: { terisi: true, nilai: 'Jawa Tengah' },
    kode_pos: emptyMaskedField,
    nama_ayah: emptyMaskedField,
    pekerjaan_ayah: emptyMaskedField,
    nama_ibu: emptyMaskedField,
    pekerjaan_ibu: emptyMaskedField,
    nama_wali: emptyMaskedField,
    no_hp_wali: { terisi: true, nilai: '08••••5678' },
  },
};

const portalResponse: WaliPortalResponse = {
  profil: {
    nama_lengkap: 'Ali Mustofa',
    nis: '123',
    nisn: '00••••4321',
    nik: '33••••1234',
    jenis_kelamin: 'Laki-laki',
    tempat_lahir: 'Jepara',
    tanggal_lahir: '••-••-1970',
    no_hp_santri: null,
    kelas: null,
    asrama: 'Al-Falah',
    status: 'Alumni/Lulus',
    tanggal_masuk: null,
    tahun_masuk: '1985',
    tahun_keluar: '1991',
    alamat_jalan: 'Dukuh ******',
    desa_kelurahan: 'Langon',
    kecamatan: 'Tahunan',
    kabupaten_kota: 'Jepara',
    provinsi: 'Jawa Tengah',
    kode_pos: null,
    nama_ayah: null,
    pekerjaan_ayah: null,
    nama_ibu: null,
    pekerjaan_ibu: null,
    nama_wali: null,
    no_hp_wali: '08••••5678',
  },
  pelanggaran: [],
  prestasi: [],
  catatan: [],
  pengajuan_menunggu: [],
};

function startSearch(name = 'Ali') {
  fireEvent.change(screen.getByLabelText('Nama santri atau alumni'), {
    target: { value: name },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Cari data' }));
}

async function openSummary() {
  api.searchPublicStudents.mockResolvedValue([searchResult]);
  api.getPublicStudentSummary.mockResolvedValue(maskedSummary);
  render(<CekDataPublik />);
  startSearch();
  await screen.findByText('Ali Mustofa');
  fireEvent.click(screen.getByRole('button', { name: /Pilih Ali Mustofa/i }));
  await screen.findByText('33••••1234');
}

function fillClaimant() {
  fireEvent.change(screen.getByLabelText('Nama pengaju'), {
    target: { value: 'Ahmad Mustofa' },
  });
  fireEvent.change(screen.getByLabelText('Hubungan dengan santri/alumni'), {
    target: { value: 'Anak' },
  });
  fireEvent.change(screen.getByLabelText('Nomor WhatsApp pengaju'), {
    target: { value: '081234567890' },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('pencarian data publik', () => {
  it('menolak pencarian dengan kurang dari tiga huruf', () => {
    render(<CekDataPublik />);
    startSearch('Al');
    expect(screen.getByText('Ketik minimal 3 huruf nama.')).toBeInTheDocument();
    expect(api.searchPublicStudents).not.toHaveBeenCalled();
  });

  it('mencari halaman pertama dan hanya menampilkan alamat umum', async () => {
    api.searchPublicStudents.mockResolvedValue([searchResult]);
    render(<CekDataPublik />);
    startSearch();

    expect(await screen.findByText('Langon, Tahunan, Jepara')).toBeInTheDocument();
    expect(screen.queryByText(/RT 03/i)).not.toBeInTheDocument();
    expect(api.searchPublicStudents).toHaveBeenCalledWith('Ali', 1);
  });

  it('menyediakan semua hasil melalui halaman berisi 20 data', async () => {
    api.searchPublicStudents.mockResolvedValue([searchResult]);
    render(<CekDataPublik />);
    startSearch();
    await screen.findByText('Halaman 1 dari 3');

    fireEvent.click(screen.getByRole('button', { name: 'Halaman berikutnya' }));

    await waitFor(() => {
      expect(api.searchPublicStudents).toHaveBeenLastCalledWith('Ali', 2);
    });
    expect(screen.getByText('20 hasil per halaman')).toBeInTheDocument();
  });

  it('menampilkan nilai yang sudah disamarkan oleh server', async () => {
    await openSummary();
    expect(screen.getByText('33••••1234')).toBeInTheDocument();
    expect(screen.getByText('••-••-1970')).toBeInTheDocument();
    expect(screen.queryByText('3312345678901234')).not.toBeInTheDocument();
  });

  it('mewajibkan identitas pengaju saat mengirim koreksi', async () => {
    await openSummary();
    fireEvent.click(screen.getByRole('button', { name: 'Ajukan koreksi' }));

    expect(screen.getByLabelText('Nama pengaju')).toBeRequired();
    expect(screen.getByLabelText('Hubungan dengan santri/alumni')).toBeRequired();
    expect(screen.getByLabelText('Nomor WhatsApp pengaju')).toBeRequired();
  });

  it('permintaan akses tidak mengirim koreksi data', async () => {
    api.requestWaliAccess.mockResolvedValue('request-id');
    await openSummary();
    fireEvent.click(screen.getByRole('button', { name: 'Minta akses lengkap' }));
    fillClaimant();
    fireEvent.click(screen.getByRole('button', { name: 'Kirim permintaan akses' }));

    await screen.findByText(/permintaan akses sudah dikirim/i);
    expect(api.submitPublicCorrection).not.toHaveBeenCalled();
    expect(api.requestWaliAccess).toHaveBeenCalledWith(searchResult.selection_token, {
      nama_pengaju: 'Ahmad Mustofa',
      hubungan: 'Anak',
      kontak_wa: '081234567890',
    });
  });
});

describe('portal wali', () => {
  it('menampilkan pesan yang sama untuk token salah dan token tidak aktif', async () => {
    const commonMessage = 'Tautan tidak dapat digunakan. Hubungi admin untuk meminta tautan baru.';

    window.location.hash = '#SALAH';
    const invalidView = render(<PortalSantri />);
    expect(await screen.findByText(commonMessage)).toBeInTheDocument();
    invalidView.unmount();

    window.location.hash = '#7KMP4XQ9WD';
    api.getWaliPortal.mockResolvedValue(null);
    render(<PortalSantri />);
    expect(await screen.findByText(commonMessage)).toBeInTheDocument();
  });

  it('hanya menampilkan profil yang dikirim RPC', async () => {
    window.location.hash = '#7KMP4XQ9WD';
    api.getWaliPortal.mockResolvedValue(portalResponse);
    render(<PortalSantri />);

    expect(await screen.findByRole('heading', { name: 'Ali Mustofa' })).toBeInTheDocument();
    expect(screen.getByText('33••••1234')).toBeInTheDocument();
    expect(screen.queryByText(/tagihan bulan/i)).not.toBeInTheDocument();
  });
});

describe('pendaftaran publik', () => {
  it('hanya menyediakan pendaftaran baru tanpa pencarian data lama', () => {
    window.history.replaceState(null, '', '/pendaftaran?edit=student-id');
    render(<PublicPendaftaran />);

    expect(screen.getByRole('heading', { name: 'Pendaftaran Santri Baru' })).toBeInTheDocument();
    expect(screen.queryByText('Edit Data Santri')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/cari nama santri/i)).not.toBeInTheDocument();
  });

  it('mengirim formulir baru ke antrean peninjauan admin', async () => {
    api.submitNewRegistration.mockResolvedValue('submission-id');
    render(<PublicPendaftaran />);

    fireEvent.change(screen.getByLabelText(/^Nama lengkap santri/), {
      target: { value: 'Hasan Baru' },
    });
    fireEvent.change(screen.getByLabelText('Nama pengaju'), {
      target: { value: 'Umar' },
    });
    fireEvent.change(screen.getByLabelText('Hubungan dengan santri'), {
      target: { value: 'Ayah' },
    });
    fireEvent.change(screen.getByLabelText('Nomor WhatsApp pengaju'), {
      target: { value: '081234567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kirim pendaftaran' }));

    expect(await screen.findByText(/akan ditinjau oleh admin/i)).toBeInTheDocument();
  });
});
