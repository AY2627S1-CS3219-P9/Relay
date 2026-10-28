import type { DeleteUserRequest, UpdateUserRequest, PromoteUserToAdminRequest, DemoteAdminToUserRequest } from './requests'
import type { ApiResult, GetUserResponse, UpdateUserResponse, GetAdminsResponse, GetUserProfileBySubjectResponse } from './responses'
/** Browser-facing profile and admin-list boundary served by User Service. */
export interface UserApi {
  getUser(): Promise<ApiResult<GetUserResponse>>
  updateUser(request: UpdateUserRequest): Promise<ApiResult<UpdateUserResponse>>
  deleteUser(request: DeleteUserRequest): Promise<ApiResult<undefined>>
  getAdmins(): Promise<ApiResult<GetAdminsResponse>>
  /** Legacy role-management alias; new clients use UserAuthApi. */
  promoteUserToAdmin(request: PromoteUserToAdminRequest): Promise<ApiResult<undefined>>
  /** Legacy role-management alias; new clients use UserAuthApi. */
  demoteAdminToUser(request: DemoteAdminToUserRequest): Promise<ApiResult<undefined>>
}
export interface UserProfileLookupApi {
  getProfileBySubject(subject: string): Promise<ApiResult<GetUserProfileBySubjectResponse>>
}
