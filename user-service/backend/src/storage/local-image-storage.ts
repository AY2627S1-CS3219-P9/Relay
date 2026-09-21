import type { ImageStorage, ImageUpload, StoredImage } from './image-storage.js'

/**
 * Development storage contract. The S3-compatible implementation will be
 * added in the storage step without changing callers of ImageStorage.
 */
export class LocalImageStorage implements ImageStorage {
  async upload(_input: ImageUpload, _ownerSub: string): Promise<StoredImage> {
    throw new Error('Local image storage is not configured yet.')
  }

  async delete(_key: string): Promise<void> {
    throw new Error('Local image storage is not configured yet.')
  }
}
