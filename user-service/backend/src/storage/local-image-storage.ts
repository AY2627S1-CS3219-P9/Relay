import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getEnv } from '../config/env.js'
import type { ImageStorage, ImageUpload, StoredImage } from './image-storage.js'

function encodeKeyPart(value: string): string {
  return encodeURIComponent(value.replace(/[^a-zA-Z0-9._-]/g, '_'))
}

/** S3-compatible adapter for Floci locally and Amazon S3 in production. */
export class FlociS3ImageStorage implements ImageStorage {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly endpoint: string
  private readonly publicEndpoint: string

  constructor() {
    const env = getEnv()
    this.endpoint = env.s3Endpoint.replace(/\/$/, '')
    this.publicEndpoint = env.s3PublicEndpoint.replace(/\/$/, '')
    this.bucket = env.s3Bucket
    this.client = new S3Client({
      endpoint: this.endpoint,
      region: env.s3Region,
      forcePathStyle: env.s3ForcePathStyle,
      ...(env.s3AccessKeyId && env.s3SecretAccessKey
        ? { credentials: { accessKeyId: env.s3AccessKeyId, secretAccessKey: env.s3SecretAccessKey } }
        : {}),
    })
  }

  async upload(input: ImageUpload, ownerSub: string): Promise<StoredImage> {
    const key = `profiles/${encodeKeyPart(ownerSub)}/${crypto.randomUUID()}.${input.extension}`

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    )

    return { key, url: await this.url(key) }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    )
  }

  async url(key: string): Promise<string> {
    if (this.endpoint.includes('localhost') || this.endpoint.includes('127.0.0.1')) {
      return `${this.publicEndpoint}/${encodeURIComponent(this.bucket)}/${key
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 900 },
    )
  }
}

/** Backwards-compatible local adapter name for the configured S3-compatible store. */
export class LocalImageStorage extends FlociS3ImageStorage {}
