import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock file service functionality
interface FileMetadata {
  id: string
  name: string
  size: number
  type: string
  path: string
  uploaded_at: string
  uploaded_by: string
}

interface UploadOptions {
  maxSize?: number
  allowedTypes?: string[]
  generateThumbnail?: boolean
}

class FileService {
  private files: Map<string, FileMetadata> = new Map()
  private fileContents: Map<string, Buffer> = new Map()
  private maxDefaultSize = 10 * 1024 * 1024 // 10MB

  async uploadFile(
    file: { name: string; size: number; type: string; buffer: Buffer },
    userId: string,
    options: UploadOptions = {}
  ): Promise<FileMetadata> {
    const {
      maxSize = this.maxDefaultSize,
      allowedTypes = [],
      generateThumbnail = false
    } = options

    // Validate file size
    if (file.size > maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size ${maxSize}`)
    }

    // Validate file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`)
    }

    // Generate unique ID and path
    const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const path = `/uploads/${userId}/${id}-${file.name}`

    const metadata: FileMetadata = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      path,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId
    }

    // Store file metadata and contents
    this.files.set(id, metadata)
    this.fileContents.set(id, file.buffer)

    // Generate thumbnail for images if requested
    if (generateThumbnail && file.type.startsWith('image/')) {
      await this.generateThumbnail(id)
    }

    return metadata
  }

  async getFile(id: string): Promise<FileMetadata | null> {
    return this.files.get(id) || null
  }

  async getFileContent(id: string): Promise<Buffer | null> {
    return this.fileContents.get(id) || null
  }

  async deleteFile(id: string, userId: string): Promise<boolean> {
    const file = this.files.get(id)
    if (!file) {
      return false
    }

    // Check if user owns the file
    if (file.uploaded_by !== userId) {
      throw new Error('Unauthorized: You can only delete your own files')
    }

    this.files.delete(id)
    this.fileContents.delete(id)
    return true
  }

  async getUserFiles(userId: string): Promise<FileMetadata[]> {
    return Array.from(this.files.values()).filter(file => file.uploaded_by === userId)
  }

  async getFilesByType(type: string): Promise<FileMetadata[]> {
    return Array.from(this.files.values()).filter(file => file.type === type)
  }

  async searchFiles(query: string, userId?: string): Promise<FileMetadata[]> {
    const files = Array.from(this.files.values())
    const filtered = userId ? files.filter(f => f.uploaded_by === userId) : files
    
    return filtered.filter(file => 
      file.name.toLowerCase().includes(query.toLowerCase())
    )
  }

  async moveFile(id: string, newPath: string, userId: string): Promise<FileMetadata> {
    const file = this.files.get(id)
    if (!file) {
      throw new Error('File not found')
    }

    if (file.uploaded_by !== userId) {
      throw new Error('Unauthorized: You can only move your own files')
    }

    const updatedFile = { ...file, path: newPath }
    this.files.set(id, updatedFile)
    return updatedFile
  }

  async copyFile(id: string, userId: string): Promise<FileMetadata> {
    const originalFile = this.files.get(id)
    if (!originalFile) {
      throw new Error('File not found')
    }

    const originalContent = this.fileContents.get(id)
    if (!originalContent) {
      throw new Error('File content not found')
    }

    // Create copy with new ID
    const copyId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const copyPath = `/uploads/${userId}/${copyId}-copy-${originalFile.name}`

    const copyMetadata: FileMetadata = {
      id: copyId,
      name: `copy-${originalFile.name}`,
      size: originalFile.size,
      type: originalFile.type,
      path: copyPath,
      uploaded_at: new Date().toISOString(),
      uploaded_by: userId
    }

    this.files.set(copyId, copyMetadata)
    this.fileContents.set(copyId, Buffer.from(originalContent))

    return copyMetadata
  }

  async getStorageStats(userId?: string): Promise<{
    totalFiles: number
    totalSize: number
    averageSize: number
    typeBreakdown: Record<string, number>
  }> {
    const files = userId 
      ? Array.from(this.files.values()).filter(f => f.uploaded_by === userId)
      : Array.from(this.files.values())

    const totalFiles = files.length
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const averageSize = totalFiles > 0 ? totalSize / totalFiles : 0

    const typeBreakdown: Record<string, number> = {}
    files.forEach(file => {
      typeBreakdown[file.type] = (typeBreakdown[file.type] || 0) + 1
    })

    return {
      totalFiles,
      totalSize,
      averageSize,
      typeBreakdown
    }
  }

  private async generateThumbnail(fileId: string): Promise<void> {
    // Mock thumbnail generation
    const thumbnailId = `thumb-${fileId}`
    const originalFile = this.files.get(fileId)
    
    if (originalFile) {
      const thumbnailMetadata: FileMetadata = {
        id: thumbnailId,
        name: `thumb-${originalFile.name}`,
        size: Math.floor(originalFile.size * 0.1), // Thumbnail is 10% of original size
        type: originalFile.type,
        path: originalFile.path.replace('/uploads/', '/thumbnails/'),
        uploaded_at: new Date().toISOString(),
        uploaded_by: originalFile.uploaded_by
      }

      this.files.set(thumbnailId, thumbnailMetadata)
      // Mock thumbnail content (smaller buffer)
      this.fileContents.set(thumbnailId, Buffer.alloc(thumbnailMetadata.size, 0))
    }
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    let deletedCount = 0
    for (const [id, file] of this.files.entries()) {
      if (new Date(file.uploaded_at) < cutoffDate) {
        this.files.delete(id)
        this.fileContents.delete(id)
        deletedCount++
      }
    }

    return deletedCount
  }
}

describe('FileService', () => {
  let fileService: FileService
  const mockUserId = 'user-123'
  const mockFile = {
    name: 'test.txt',
    size: 1024,
    type: 'text/plain',
    buffer: Buffer.from('test content')
  }

  beforeEach(() => {
    fileService = new FileService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const metadata = await fileService.uploadFile(mockFile, mockUserId)

      expect(metadata.name).toBe('test.txt')
      expect(metadata.size).toBe(1024)
      expect(metadata.type).toBe('text/plain')
      expect(metadata.uploaded_by).toBe(mockUserId)
      expect(metadata.id).toMatch(/^file-\d+-[a-z0-9]+$/)
      expect(metadata.path).toMatch(/^\/uploads\/user-123\/file-\d+-[a-z0-9]+-test\.txt$/)
    })

    it('should reject files that exceed size limit', async () => {
      const largeFile = { ...mockFile, size: 20 * 1024 * 1024 } // 20MB

      await expect(
        fileService.uploadFile(largeFile, mockUserId, { maxSize: 10 * 1024 * 1024 })
      ).rejects.toThrow('File size 20971520 exceeds maximum allowed size 10485760')
    })

    it('should reject files with disallowed types', async () => {
      const executableFile = { ...mockFile, type: 'application/x-executable' }

      await expect(
        fileService.uploadFile(executableFile, mockUserId, { 
          allowedTypes: ['text/plain', 'image/jpeg'] 
        })
      ).rejects.toThrow('File type application/x-executable is not allowed')
    })

    it('should allow files with allowed types', async () => {
      const imageFile = { ...mockFile, type: 'image/jpeg' }

      const metadata = await fileService.uploadFile(imageFile, mockUserId, {
        allowedTypes: ['image/jpeg', 'image/png']
      })

      expect(metadata.type).toBe('image/jpeg')
    })

    it('should generate thumbnail for images when requested', async () => {
      const imageFile = { ...mockFile, name: 'image.jpg', type: 'image/jpeg' }

      await fileService.uploadFile(imageFile, mockUserId, { generateThumbnail: true })

      // Check if thumbnail was created
      const files = await fileService.getUserFiles(mockUserId)
      const thumbnails = files.filter(f => f.name.startsWith('thumb-'))
      
      expect(thumbnails).toHaveLength(1)
      expect(thumbnails[0].size).toBeLessThan(imageFile.size)
    })
  })

  describe('getFile and getFileContent', () => {
    it('should retrieve file metadata', async () => {
      const uploaded = await fileService.uploadFile(mockFile, mockUserId)
      const retrieved = await fileService.getFile(uploaded.id)

      expect(retrieved).toEqual(uploaded)
    })

    it('should retrieve file content', async () => {
      const uploaded = await fileService.uploadFile(mockFile, mockUserId)
      const content = await fileService.getFileContent(uploaded.id)

      expect(content).toEqual(mockFile.buffer)
    })

    it('should return null for non-existent file', async () => {
      const file = await fileService.getFile('nonexistent')
      const content = await fileService.getFileContent('nonexistent')

      expect(file).toBeNull()
      expect(content).toBeNull()
    })
  })

  describe('deleteFile', () => {
    it('should delete own file', async () => {
      const uploaded = await fileService.uploadFile(mockFile, mockUserId)
      const deleted = await fileService.deleteFile(uploaded.id, mockUserId)

      expect(deleted).toBe(true)
      
      const file = await fileService.getFile(uploaded.id)
      expect(file).toBeNull()
    })

    it('should not delete other users files', async () => {
      const uploaded = await fileService.uploadFile(mockFile, mockUserId)

      await expect(
        fileService.deleteFile(uploaded.id, 'other-user')
      ).rejects.toThrow('Unauthorized: You can only delete your own files')
    })

    it('should return false for non-existent file', async () => {
      const deleted = await fileService.deleteFile('nonexistent', mockUserId)
      expect(deleted).toBe(false)
    })
  })

  describe('getUserFiles', () => {
    it('should return files for specific user', async () => {
      await fileService.uploadFile(mockFile, mockUserId)
      await fileService.uploadFile({ ...mockFile, name: 'file2.txt' }, mockUserId)
      await fileService.uploadFile(mockFile, 'other-user')

      const userFiles = await fileService.getUserFiles(mockUserId)

      expect(userFiles).toHaveLength(2)
      expect(userFiles.every(f => f.uploaded_by === mockUserId)).toBe(true)
    })

    it('should return empty array for user with no files', async () => {
      const userFiles = await fileService.getUserFiles('user-with-no-files')
      expect(userFiles).toHaveLength(0)
    })
  })

  describe('getFilesByType', () => {
    it('should return files of specific type', async () => {
      await fileService.uploadFile(mockFile, mockUserId) // text/plain
      await fileService.uploadFile({ ...mockFile, type: 'image/jpeg' }, mockUserId)
      await fileService.uploadFile({ ...mockFile, type: 'image/jpeg' }, 'other-user')

      const textFiles = await fileService.getFilesByType('text/plain')
      const imageFiles = await fileService.getFilesByType('image/jpeg')

      expect(textFiles).toHaveLength(1)
      expect(imageFiles).toHaveLength(2)
      expect(textFiles[0].type).toBe('text/plain')
      expect(imageFiles.every(f => f.type === 'image/jpeg')).toBe(true)
    })
  })

  describe('searchFiles', () => {
    beforeEach(async () => {
      await fileService.uploadFile({ ...mockFile, name: 'document.pdf' }, mockUserId)
      await fileService.uploadFile({ ...mockFile, name: 'image.jpg' }, mockUserId)
      await fileService.uploadFile({ ...mockFile, name: 'report.docx' }, 'other-user')
    })

    it('should search files by name', async () => {
      const results = await fileService.searchFiles('doc')

      expect(results).toHaveLength(2) // document.pdf and report.docx
      expect(results.every(f => f.name.toLowerCase().includes('doc'))).toBe(true)
    })

    it('should search files for specific user', async () => {
      const results = await fileService.searchFiles('doc', mockUserId)

      expect(results).toHaveLength(1) // only document.pdf
      expect(results[0].name).toBe('document.pdf')
      expect(results[0].uploaded_by).toBe(mockUserId)
    })

    it('should be case insensitive', async () => {
      const results = await fileService.searchFiles('DOC')

      expect(results).toHaveLength(2)
    })
  })

  describe('moveFile', () => {
    it('should move own file', async () => {
      const uploaded = await fileService.uploadFile(mockFile, mockUserId)
      const newPath = '/uploads/user-123/moved/test.txt'

      const moved = await fileService.moveFile(uploaded.id, newPath, mockUserId)

      expect(moved.path).toBe(newPath)
      expect(moved.id).toBe(uploaded.id) // Same file, different path
    })

    it('should not move other users files', async () => {
      const uploaded = await fileService.uploadFile(mockFile, mockUserId)

      await expect(
        fileService.moveFile(uploaded.id, '/new/path', 'other-user')
      ).rejects.toThrow('Unauthorized: You can only move your own files')
    })

    it('should throw error for non-existent file', async () => {
      await expect(
        fileService.moveFile('nonexistent', '/new/path', mockUserId)
      ).rejects.toThrow('File not found')
    })
  })

  describe('copyFile', () => {
    it('should create copy of file', async () => {
      const original = await fileService.uploadFile(mockFile, mockUserId)
      const copy = await fileService.copyFile(original.id, 'other-user')

      expect(copy.id).not.toBe(original.id)
      expect(copy.name).toBe('copy-test.txt')
      expect(copy.size).toBe(original.size)
      expect(copy.type).toBe(original.type)
      expect(copy.uploaded_by).toBe('other-user')

      // Verify content was copied
      const originalContent = await fileService.getFileContent(original.id)
      const copyContent = await fileService.getFileContent(copy.id)
      expect(copyContent).toEqual(originalContent)
    })

    it('should throw error for non-existent file', async () => {
      await expect(
        fileService.copyFile('nonexistent', mockUserId)
      ).rejects.toThrow('File not found')
    })
  })

  describe('getStorageStats', () => {
    beforeEach(async () => {
      await fileService.uploadFile({ ...mockFile, size: 1000 }, mockUserId)
      await fileService.uploadFile({ ...mockFile, size: 2000, type: 'image/jpeg' }, mockUserId)
      await fileService.uploadFile({ ...mockFile, size: 3000 }, 'other-user')
    })

    it('should return overall stats', async () => {
      const stats = await fileService.getStorageStats()

      expect(stats.totalFiles).toBe(3)
      expect(stats.totalSize).toBe(6000)
      expect(stats.averageSize).toBe(2000)
      expect(stats.typeBreakdown).toEqual({
        'text/plain': 2,
        'image/jpeg': 1
      })
    })

    it('should return user-specific stats', async () => {
      const stats = await fileService.getStorageStats(mockUserId)

      expect(stats.totalFiles).toBe(2)
      expect(stats.totalSize).toBe(3000)
      expect(stats.averageSize).toBe(1500)
    })

    it('should handle empty storage', async () => {
      const emptyService = new FileService()
      const stats = await emptyService.getStorageStats()

      expect(stats.totalFiles).toBe(0)
      expect(stats.totalSize).toBe(0)
      expect(stats.averageSize).toBe(0)
      expect(stats.typeBreakdown).toEqual({})
    })
  })

  describe('cleanup', () => {
    it('should delete old files', async () => {
      // Upload files and manually set old dates
      const file1 = await fileService.uploadFile(mockFile, mockUserId)
      const file2 = await fileService.uploadFile({ ...mockFile, name: 'file2.txt' }, mockUserId)

      // Make file1 old (40 days ago)
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 40)
      fileService['files'].set(file1.id, { ...file1, uploaded_at: oldDate.toISOString() })

      const deletedCount = await fileService.cleanup(30)

      expect(deletedCount).toBe(1)
      expect(await fileService.getFile(file1.id)).toBeNull()
      expect(await fileService.getFile(file2.id)).not.toBeNull()
    })

    it('should not delete recent files', async () => {
      await fileService.uploadFile(mockFile, mockUserId)
      await fileService.uploadFile({ ...mockFile, name: 'file2.txt' }, mockUserId)

      const deletedCount = await fileService.cleanup(30)

      expect(deletedCount).toBe(0)
    })
  })

  describe('integration tests', () => {
    it('should handle complete file lifecycle', async () => {
      // Upload
      const uploaded = await fileService.uploadFile(mockFile, mockUserId)
      expect(uploaded.name).toBe('test.txt')

      // Retrieve
      const retrieved = await fileService.getFile(uploaded.id)
      expect(retrieved).toEqual(uploaded)

      // Move
      const moved = await fileService.moveFile(uploaded.id, '/new/location/test.txt', mockUserId)
      expect(moved.path).toBe('/new/location/test.txt')

      // Copy
      const copy = await fileService.copyFile(uploaded.id, 'other-user')
      expect(copy.uploaded_by).toBe('other-user')

      // Search
      const searchResults = await fileService.searchFiles('test')
      expect(searchResults).toHaveLength(2) // original and copy

      // Delete
      await fileService.deleteFile(uploaded.id, mockUserId)
      expect(await fileService.getFile(uploaded.id)).toBeNull()
      expect(await fileService.getFile(copy.id)).not.toBeNull() // copy still exists
    })

    it('should handle multiple users and file types', async () => {
      const users = ['user1', 'user2', 'user3']
      const fileTypes = [
        { name: 'doc.pdf', type: 'application/pdf' },
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'data.csv', type: 'text/csv' }
      ]

      // Upload files for each user
      for (const user of users) {
        for (const fileType of fileTypes) {
          await fileService.uploadFile({
            ...mockFile,
            name: fileType.name,
            type: fileType.type
          }, user)
        }
      }

      // Verify stats
      const stats = await fileService.getStorageStats()
      expect(stats.totalFiles).toBe(9) // 3 users × 3 files
      expect(stats.typeBreakdown['application/pdf']).toBe(3)
      expect(stats.typeBreakdown['image/jpeg']).toBe(3)
      expect(stats.typeBreakdown['text/csv']).toBe(3)

      // Verify user isolation
      const user1Files = await fileService.getUserFiles('user1')
      expect(user1Files).toHaveLength(3)
      expect(user1Files.every(f => f.uploaded_by === 'user1')).toBe(true)
    })
  })
})