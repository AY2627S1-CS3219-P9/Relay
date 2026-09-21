export type ImageContentType = 'image/jpeg' | 'image/png'

export type ImageUpload = {
  body: Buffer
  contentType: ImageContentType
  extension: 'jpg' | 'png'
}

export type StoredImage = {
  key: string
  url: string
}

/** Storage boundary for profile pictures. Implementations may target Floci or Amazon S3. */
export interface ImageStorage {
  upload(input: ImageUpload, ownerSub: string): Promise<StoredImage>
  delete(key: string): Promise<void>
}
