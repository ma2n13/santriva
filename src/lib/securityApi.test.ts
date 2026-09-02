import { describe, expect, it, vi } from 'vitest';

import {
  SecurityApiError,
  createSecurityApi,
  type SecurityRpcClient,
} from './securityApi';
import type {
  PublicClaimant,
  StudentCorrectionPayload,
} from '../types/security';

interface RpcCall {
  name: string;
  params?: Record<string, unknown>;
}

const claimant: PublicClaimant = {
  nama_pengaju: 'Wali Uji',
  hubungan: 'Wali',
  kontak_wa: '081200000001',
};

const correction: StudentCorrectionPayload = {
  nama_lengkap: 'Santri Uji',
  pekerjaan_ibu: 'Guru',
};

function createFakeClient(
  result: { data: unknown; error: { code?: string; message: string } | null } = {
    data: null,
    error: null,
  },
) {
  const calls: RpcCall[] = [];
  const client: SecurityRpcClient = {
    rpc: async (name, params) => {
      calls.push({ name, params });
      return result;
    },
  };

  return { calls, client };
}

describe('createSecurityApi', () => {
  it('routes every operation through the exact SQL RPC name and parameters', async () => {
    const { calls, client } = createFakeClient();
    const api = createSecurityApi(client);

    const cases: Array<{
      invoke: () => Promise<unknown>;
      name: string;
      params?: Record<string, unknown>;
    }> = [
      {
        invoke: () => api.getWaliPortal('7KMP4XQ9WD'),
        name: 'get_wali_portal',
        params: { token_input: '7KMP4XQ9WD' },
      },
      {
        invoke: () => api.submitWaliCorrection('7KMP4XQ9WD', correction, claimant),
        name: 'submit_pengajuan_wali',
        params: {
          token_input: '7KMP4XQ9WD',
          data_input: correction,
          pengaju_input: claimant,
        },
      },
      {
        invoke: () => api.searchPublicStudents('Ahmad', 2),
        name: 'search_santri_public',
        params: { search_text: 'Ahmad', page_number: 2, page_size: 20 },
      },
      {
        invoke: () => api.getPublicStudentSummary('selection-1'),
        name: 'get_ringkasan_santri_public',
        params: { selection_token_input: 'selection-1' },
      },
      {
        invoke: () => api.submitPublicCorrection('selection-1', correction, claimant),
        name: 'submit_koreksi_public',
        params: {
          selection_token_input: 'selection-1',
          data_input: correction,
          pengaju_input: claimant,
        },
      },
      {
        invoke: () => api.requestWaliAccess('selection-1', claimant),
        name: 'request_wali_access',
        params: { selection_token_input: 'selection-1', pengaju_input: claimant },
      },
      {
        invoke: () => api.submitNewRegistration(correction, claimant),
        name: 'submit_pendaftaran_baru',
        params: { data_input: correction, pengaju_input: claimant },
      },
      { invoke: () => api.getMyProfile(), name: 'get_my_profile' },
      { invoke: () => api.listRegistrationRoles(), name: 'list_registration_roles' },
      {
        invoke: () => api.registerMyProfile('Petugas Uji', 'Admin'),
        name: 'register_my_profile',
        params: { nama_lengkap: 'Petugas Uji', usulan_role: 'Admin' },
      },
      {
        invoke: () => api.reviewSubmission('submission-1', 'Disetujui', 'Data sesuai'),
        name: 'review_pengajuan',
        params: {
          pengajuan_id: 'submission-1',
          keputusan: 'Disetujui',
          catatan_admin: 'Data sesuai',
        },
      },
      {
        invoke: () => api.getOrCreateWaliToken('student-1'),
        name: 'get_or_create_wali_token',
        params: { santri_id: 'student-1' },
      },
      {
        invoke: () => api.rotateWaliToken('student-1'),
        name: 'rotate_wali_token',
        params: { santri_id: 'student-1' },
      },
      {
        invoke: () => api.setWaliAccessStatus('student-1', false),
        name: 'set_wali_access_status',
        params: { santri_id: 'student-1', aktif: false },
      },
      {
        invoke: () => api.reviewWaliAccessRequest('request-1', 'Ditolak', 'Tidak cocok'),
        name: 'review_wali_access_request',
        params: {
          request_id: 'request-1',
          keputusan: 'Ditolak',
          catatan_admin: 'Tidak cocok',
        },
      },
      {
        invoke: () => api.getTakziranStudents('Ahmad'),
        name: 'get_takziran_santri',
        params: { search_text: 'Ahmad' },
      },
      {
        invoke: () => api.saveRole(null, 'Petugas', ['akses_induk']),
        name: 'admin_save_role',
        params: {
          role_id: null,
          nama_role: 'Petugas',
          permissions: ['akses_induk'],
        },
      },
      {
        invoke: () => api.deleteRole('role-1'),
        name: 'admin_delete_role',
        params: { role_id: 'role-1' },
      },
      {
        invoke: () => api.updateUser('user-1', 'role-1', 'Aktif'),
        name: 'admin_update_user',
        params: { user_id: 'user-1', role_id: 'role-1', status_akun: 'Aktif' },
      },
    ];

    for (const testCase of cases) {
      await testCase.invoke();
      expect(calls.at(-1)).toEqual({
        name: testCase.name,
        params: testCase.params,
      });
    }

    expect(calls).toHaveLength(cases.length);
  });

  it('maps public database failures to a safe message without logging details', async () => {
    const { client } = createFakeClient({
      data: null,
      error: { code: '22023', message: 'detail database dan data pribadi' },
    });
    const adminLogger = vi.fn();
    const api = createSecurityApi(client, adminLogger);

    await expect(
      api.submitWaliCorrection('TOKEN-RAHASIA', correction, claimant),
    ).rejects.toEqual(
      new SecurityApiError('Permintaan tidak dapat diproses. Periksa data lalu coba lagi.'),
    );
    expect(adminLogger).not.toHaveBeenCalled();
  });

  it('logs only RPC name and error code for an authenticated admin failure', async () => {
    const { client } = createFakeClient({
      data: null,
      error: { code: '42501', message: 'pesan internal yang tidak boleh dicatat' },
    });
    const adminLogger = vi.fn();
    const api = createSecurityApi(client, adminLogger);

    await expect(api.deleteRole('role-rahasia')).rejects.toBeInstanceOf(SecurityApiError);
    expect(adminLogger).toHaveBeenCalledWith({
      rpcName: 'admin_delete_role',
      code: '42501',
    });
  });
});
