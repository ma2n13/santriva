import type {
  AccountStatus,
  MyProfile,
  NewRegistrationPayload,
  PublicClaimant,
  PublicMaskedSummary,
  PublicSearchResult,
  ReviewDecision,
  ReviewResult,
  RolePermission,
  StudentCorrectionPayload,
  TakziranStudentSummary,
  WaliPortalResponse,
} from '../types/security';

interface RpcError {
  code?: string;
  message: string;
}

interface RpcResult {
  data: unknown;
  error: RpcError | null;
}

export interface SecurityRpcClient {
  rpc(name: string, params?: Record<string, unknown>): PromiseLike<RpcResult>;
}

export interface AdminErrorLog {
  rpcName: string;
  code?: string;
}

export type AdminErrorLogger = (entry: AdminErrorLog) => void;

export class SecurityApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityApiError';
  }
}

const SAFE_PUBLIC_ERROR = 'Permintaan tidak dapat diproses. Periksa data lalu coba lagi.';
const SAFE_READ_ERROR = 'Data tidak dapat dimuat. Silakan coba lagi.';
const SAFE_ADMIN_ERROR = 'Tindakan tidak dapat diselesaikan. Periksa izin dan data lalu coba lagi.';

function defaultAdminLogger(entry: AdminErrorLog) {
  console.error('[securityApi] RPC admin gagal', entry);
}

export function createSecurityApi(
  client: SecurityRpcClient,
  adminLogger: AdminErrorLogger = defaultAdminLogger,
) {
  async function callRpc<T>(
    rpcName: string,
    params: Record<string, unknown> | undefined,
    safeMessage: string,
    logAdminError = false,
  ): Promise<T> {
    const { data, error } = await client.rpc(rpcName, params);

    if (error) {
      if (logAdminError) {
        adminLogger({ rpcName, code: error.code });
      }
      throw new SecurityApiError(safeMessage);
    }

    return data as T;
  }

  return {
    getWaliPortal: (token: string) =>
      callRpc<WaliPortalResponse | null>(
        'get_wali_portal',
        { token_input: token },
        SAFE_READ_ERROR,
      ),

    submitWaliCorrection: (
      token: string,
      data: StudentCorrectionPayload,
      claimant: PublicClaimant,
    ) =>
      callRpc<string>(
        'submit_pengajuan_wali',
        { token_input: token, data_input: data, pengaju_input: claimant },
        SAFE_PUBLIC_ERROR,
      ),

    searchPublicStudents: (searchText: string, pageNumber = 1) =>
      callRpc<PublicSearchResult[]>(
        'search_santri_public',
        { search_text: searchText, page_number: pageNumber, page_size: 20 },
        SAFE_PUBLIC_ERROR,
      ),

    getPublicStudentSummary: (selectionToken: string) =>
      callRpc<PublicMaskedSummary>(
        'get_ringkasan_santri_public',
        { selection_token_input: selectionToken },
        SAFE_PUBLIC_ERROR,
      ),

    submitPublicCorrection: (
      selectionToken: string,
      data: StudentCorrectionPayload,
      claimant: PublicClaimant,
    ) =>
      callRpc<string>(
        'submit_koreksi_public',
        {
          selection_token_input: selectionToken,
          data_input: data,
          pengaju_input: claimant,
        },
        SAFE_PUBLIC_ERROR,
      ),

    requestWaliAccess: (selectionToken: string, claimant: PublicClaimant) =>
      callRpc<string>(
        'request_wali_access',
        { selection_token_input: selectionToken, pengaju_input: claimant },
        SAFE_PUBLIC_ERROR,
      ),

    submitNewRegistration: (data: NewRegistrationPayload, claimant: PublicClaimant) =>
      callRpc<string>(
        'submit_pendaftaran_baru',
        { data_input: data, pengaju_input: claimant },
        SAFE_PUBLIC_ERROR,
      ),

    getMyProfile: () =>
      callRpc<MyProfile | null>('get_my_profile', undefined, SAFE_READ_ERROR, true),

    listRegistrationRoles: () =>
      callRpc<Array<{ nama_role: string }>>(
        'list_registration_roles',
        undefined,
        SAFE_READ_ERROR,
      ),

    registerMyProfile: (fullName: string, proposedRole: string) =>
      callRpc<MyProfile>(
        'register_my_profile',
        { nama_lengkap: fullName, usulan_role: proposedRole },
        SAFE_PUBLIC_ERROR,
      ),

    reviewSubmission: (
      submissionId: string,
      decision: ReviewDecision,
      adminNote: string,
    ) =>
      callRpc<ReviewResult>(
        'review_pengajuan',
        {
          pengajuan_id: submissionId,
          keputusan: decision,
          catatan_admin: adminNote,
        },
        SAFE_ADMIN_ERROR,
        true,
      ),

    getOrCreateWaliToken: (studentId: string) =>
      callRpc<string>(
        'get_or_create_wali_token',
        { santri_id: studentId },
        SAFE_ADMIN_ERROR,
        true,
      ),

    rotateWaliToken: (studentId: string) =>
      callRpc<string>(
        'rotate_wali_token',
        { santri_id: studentId },
        SAFE_ADMIN_ERROR,
        true,
      ),

    setWaliAccessStatus: (studentId: string, active: boolean) =>
      callRpc<boolean>(
        'set_wali_access_status',
        { santri_id: studentId, aktif: active },
        SAFE_ADMIN_ERROR,
        true,
      ),

    reviewWaliAccessRequest: (
      requestId: string,
      decision: ReviewDecision,
      adminNote: string,
    ) =>
      callRpc<ReviewResult>(
        'review_wali_access_request',
        { request_id: requestId, keputusan: decision, catatan_admin: adminNote },
        SAFE_ADMIN_ERROR,
        true,
      ),

    getTakziranStudents: (searchText: string | null = null) =>
      callRpc<TakziranStudentSummary[]>(
        'get_takziran_santri',
        { search_text: searchText },
        SAFE_ADMIN_ERROR,
        true,
      ),

    saveRole: (roleId: string | null, roleName: string, permissions: RolePermission[]) =>
      callRpc<string>(
        'admin_save_role',
        { role_id: roleId, nama_role: roleName, permissions },
        SAFE_ADMIN_ERROR,
        true,
      ),

    deleteRole: (roleId: string) =>
      callRpc<boolean>(
        'admin_delete_role',
        { role_id: roleId },
        SAFE_ADMIN_ERROR,
        true,
      ),

    updateUser: (userId: string, roleId: string | null, status: AccountStatus) =>
      callRpc<boolean>(
        'admin_update_user',
        { user_id: userId, role_id: roleId, status_akun: status },
        SAFE_ADMIN_ERROR,
        true,
      ),
  };
}

export type SecurityApi = ReturnType<typeof createSecurityApi>;

let defaultApiPromise: Promise<SecurityApi> | null = null;

function getDefaultApi(): Promise<SecurityApi> {
  if (!defaultApiPromise) {
    defaultApiPromise = import('./supabase').then(({ supabase }) => {
      const client: SecurityRpcClient = {
        rpc: (name, params) =>
          supabase.rpc(name, params) as unknown as PromiseLike<RpcResult>,
      };
      return createSecurityApi(client);
    });
  }

  return defaultApiPromise;
}

export async function getWaliPortal(token: string) {
  return (await getDefaultApi()).getWaliPortal(token);
}

export async function submitWaliCorrection(
  token: string,
  data: StudentCorrectionPayload,
  claimant: PublicClaimant,
) {
  return (await getDefaultApi()).submitWaliCorrection(token, data, claimant);
}

export async function searchPublicStudents(searchText: string, pageNumber = 1) {
  return (await getDefaultApi()).searchPublicStudents(searchText, pageNumber);
}

export async function getPublicStudentSummary(selectionToken: string) {
  return (await getDefaultApi()).getPublicStudentSummary(selectionToken);
}

export async function submitPublicCorrection(
  selectionToken: string,
  data: StudentCorrectionPayload,
  claimant: PublicClaimant,
) {
  return (await getDefaultApi()).submitPublicCorrection(selectionToken, data, claimant);
}

export async function requestWaliAccess(selectionToken: string, claimant: PublicClaimant) {
  return (await getDefaultApi()).requestWaliAccess(selectionToken, claimant);
}

export async function submitNewRegistration(
  data: NewRegistrationPayload,
  claimant: PublicClaimant,
) {
  return (await getDefaultApi()).submitNewRegistration(data, claimant);
}

export async function getMyProfile() {
  return (await getDefaultApi()).getMyProfile();
}

export async function listRegistrationRoles() {
  return (await getDefaultApi()).listRegistrationRoles();
}

export async function registerMyProfile(fullName: string, proposedRole: string) {
  return (await getDefaultApi()).registerMyProfile(fullName, proposedRole);
}

export async function reviewSubmission(
  submissionId: string,
  decision: ReviewDecision,
  adminNote: string,
) {
  return (await getDefaultApi()).reviewSubmission(submissionId, decision, adminNote);
}

export async function getOrCreateWaliToken(studentId: string) {
  return (await getDefaultApi()).getOrCreateWaliToken(studentId);
}

export async function rotateWaliToken(studentId: string) {
  return (await getDefaultApi()).rotateWaliToken(studentId);
}

export async function setWaliAccessStatus(studentId: string, active: boolean) {
  return (await getDefaultApi()).setWaliAccessStatus(studentId, active);
}

export async function reviewWaliAccessRequest(
  requestId: string,
  decision: ReviewDecision,
  adminNote: string,
) {
  return (await getDefaultApi()).reviewWaliAccessRequest(requestId, decision, adminNote);
}

export async function getTakziranStudents(searchText: string | null = null) {
  return (await getDefaultApi()).getTakziranStudents(searchText);
}

export async function saveRole(
  roleId: string | null,
  roleName: string,
  permissions: RolePermission[],
) {
  return (await getDefaultApi()).saveRole(roleId, roleName, permissions);
}

export async function deleteRole(roleId: string) {
  return (await getDefaultApi()).deleteRole(roleId);
}

export async function updateUser(
  userId: string,
  roleId: string | null,
  status: AccountStatus,
) {
  return (await getDefaultApi()).updateUser(userId, roleId, status);
}
