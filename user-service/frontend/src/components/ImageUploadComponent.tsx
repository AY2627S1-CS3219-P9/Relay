import { useState } from 'react'
import type { ImageDataUrl } from '@relay/contracts'
import { ErrorMessage } from '@relay/ui'
import { fileToDataUrl, imageFileError } from '../user/validation'

export function ImageUploadComponent({
  value,
  onChange,
}: {
  value?: ImageDataUrl
  onChange: (value?: ImageDataUrl) => void
}) {
  const [errorMessage, setErrorMessage] = useState('')

  async function chooseFile(file: File | undefined) {
    if (!file) return

    const validationError = imageFileError(file)
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    try {
      setErrorMessage('')
      onChange((await fileToDataUrl(file)) as ImageDataUrl)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to read the image.')
    }
  }

  return (
    <div className="file-upload">
      <label>
        Profile picture <span className="optional">optional</span>
        <input
          type="file"
          accept=".jpg,.png,image/jpeg,image/png"
          onChange={(event) => void chooseFile(event.target.files?.[0])}
        />
      </label>
      <small>JPG or PNG, smaller than 5 MB.</small>
      <ErrorMessage message={errorMessage} />
      {value && <img className="profile-preview" src={value} alt="Profile preview" />}
    </div>
  )
}
