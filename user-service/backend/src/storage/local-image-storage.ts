import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
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

  constructor() {
    const env = getEnv()
    this.endpoint = env.s3Endpoint.replace(/\/$/, '')
    this.bucket = env.s3Bucket
    this.client = new S3Client({
      endpoint: this.endpoint,
      region: env.s3Region,
      forcePathStyle: env.s3ForcePathStyle,
      credentials: {
        accessKeyId: env.s3AccessKeyId,
        secretAccessKey: env.s3SecretAccessKey,
      },
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

    return { key, url: this.url(key) }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    )
  }

  url(key: string): string {
    return `${this.endpoint}/${encodeURIComponent(this.bucket)}/${key
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`
  }
}

/** Backwards-compatible local adapter name for the configured S3-compatible store. */
export class LocalImageStorage extends FlociS3ImageStorage {}
