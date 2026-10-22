import {
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand,
  type UserType,
} from '@aws-sdk/client-cognito-identity-provider'
import { getEnv } from '../config/env.js'
import { prisma } from './user.repository.js'
import { SessionRepository } from './session.repository.js'

export class AdminRepository {
  private readonly env = getEnv()
  private readonly client = new CognitoIdentityProviderClient({
    region: this.env.awsRegion,
    endpoint: this.env.awsEndpointUrl,
  })
  private readonly sessions = new SessionRepository()

  async listAdminIdentities(): Promise<UserType[]> {
    const users: UserType[] = []
    let nextToken: string | undefined
    do {
      const result = await this.client.send(new ListUsersInGroupCommand({
        UserPoolId: this.env.cognitoUserPoolId,
        GroupName: this.env.cognitoAdminGroupName,
        NextToken: nextToken,
      }))
      users.push(...(result.Users ?? []))
      nextToken = result.NextToken
    } while (nextToken)
    return users
  }

  async getIdentity(email: string) {
    try {
      return await this.client.send(new AdminGetUserCommand({
        UserPoolId: this.env.cognitoUserPoolId,
        Username: email,
      }))
    } catch (error) {
      if (error instanceof Error && error.name === 'UserNotFoundException') return null
      throw error
    }
  }

  async isSuperAdmin(email: string): Promise<boolean> {
    let nextToken: string | undefined
    do {
      const result = await this.client.send(new ListUsersInGroupCommand({
        UserPoolId: this.env.cognitoUserPoolId,
        GroupName: this.env.cognitoSuperAdminGroupName,
        NextToken: nextToken,
      }))
      if (result.Users?.some((user) =>
        user.Attributes?.some((attribute) => attribute.Name === 'email' && attribute.Value?.toLowerCase() === email)
      )) return true
      nextToken = result.NextToken
    } while (nextToken)
    return false
  }

  async findProfile(subject: string) {
    return prisma.userProfile.findUnique({ where: { cognitoSub: subject } })
  }

  async findProfiles(subjects: string[]) {
    return prisma.userProfile.findMany({ where: { cognitoSub: { in: subjects } } })
  }

  async addAdmin(email: string, subject: string): Promise<void> {
    await this.sessions.revokeByCognitoSub(subject)
    await this.client.send(new AdminAddUserToGroupCommand({
      UserPoolId: this.env.cognitoUserPoolId,
      Username: email,
      GroupName: this.env.cognitoAdminGroupName,
    }))
    await this.sessions.revokeByCognitoSub(subject)
  }

  async removeAdmin(email: string, subject: string): Promise<void> {
    await this.sessions.revokeByCognitoSub(subject)
    await this.client.send(new AdminRemoveUserFromGroupCommand({
      UserPoolId: this.env.cognitoUserPoolId,
      Username: email,
      GroupName: this.env.cognitoAdminGroupName,
    }))
    await this.sessions.revokeByCognitoSub(subject)
  }
}
