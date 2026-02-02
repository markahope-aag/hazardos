import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SyncStatusIndicator, InlineSyncStatus } from '@/components/surveys/mobile/sync-status-indicator'

// Mock the offline sync hook
const mockUseOfflineSync = {
  status: 'synced' as const,
  isOnline: true,
  pendingSurveys: 0,
  pendingPhotos: 0,
  failedPhotos: 0,
  storagePercentUsed: 25,
  lastSyncAt: new Date().toISOString(),
  lastSyncError: null,
  syncNow: vi.fn(),
  retryFailed: vi.fn(),
}

vi.mock('@/lib/hooks/use-offline-sync', () => ({
  useOfflineSync: () => mockUseOfflineSync,
}))

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default state
    Object.assign(mockUseOfflineSync, {
      status: 'synced' as const,
      isOnline: true,
      pendingSurveys: 0,
      pendingPhotos: 0,
      failedPhotos: 0,
      storagePercentUsed: 25,
      lastSyncAt: new Date().toISOString(),
      lastSyncError: null,
    })
  })

  describe('compact variant', () => {
    it('should render status icon only', () => {
      render(<SyncStatusIndicator variant="compact" />)
      
      // Should have a container but no text
      expect(screen.getAllByRole('generic')).toHaveLength(2) // Container and icon
      expect(screen.queryByText('All changes saved')).not.toBeInTheDocument()
    })

    it('should show different icons for different statuses', () => {
      const { rerender } = render(<SyncStatusIndicator variant="compact" />)
      
      // Test synced status
      expect(screen.getAllByRole('generic')).toHaveLength(2)
      
      // Test syncing status
      mockUseOfflineSync.status = 'syncing'
      rerender(<SyncStatusIndicator variant="compact" />)
      expect(screen.getAllByRole('generic')).toHaveLength(2)
      
      // Test error status
      mockUseOfflineSync.status = 'error'
      rerender(<SyncStatusIndicator variant="compact" />)
      expect(screen.getAllByRole('generic')).toHaveLength(2)
    })
  })

  describe('badge variant', () => {
    it('should render with icon and status label', () => {
      render(<SyncStatusIndicator variant="badge" />)
      
      expect(screen.getByText('All changes saved')).toBeInTheDocument()
    })

    it('should apply correct styling for different statuses', () => {
      const { rerender } = render(<SyncStatusIndicator variant="badge" />)
      
      // Test synced styling
      let container = screen.getByText('All changes saved').parentElement
      expect(container).toHaveClass('bg-green-100', 'text-green-700')
      
      // Test syncing styling
      mockUseOfflineSync.status = 'syncing'
      rerender(<SyncStatusIndicator variant="badge" />)
      container = screen.getByText('Syncing...').parentElement
      expect(container).toHaveClass('bg-blue-100', 'text-blue-700')
      
      // Test error styling
      mockUseOfflineSync.status = 'error'
      rerender(<SyncStatusIndicator variant="badge" />)
      container = screen.getByText('Sync error').parentElement
      expect(container).toHaveClass('bg-red-100', 'text-red-700')
    })

    it('should show correct labels for all statuses', () => {
      const { rerender } = render(<SyncStatusIndicator variant="badge" />)
      
      expect(screen.getByText('All changes saved')).toBeInTheDocument()
      
      mockUseOfflineSync.status = 'syncing'
      rerender(<SyncStatusIndicator variant="badge" />)
      expect(screen.getByText('Syncing...')).toBeInTheDocument()
      
      mockUseOfflineSync.status = 'pending'
      rerender(<SyncStatusIndicator variant="badge" />)
      expect(screen.getByText('Changes pending')).toBeInTheDocument()
      
      mockUseOfflineSync.status = 'offline'
      rerender(<SyncStatusIndicator variant="badge" />)
      expect(screen.getByText('Offline mode')).toBeInTheDocument()
      
      mockUseOfflineSync.status = 'error'
      rerender(<SyncStatusIndicator variant="badge" />)
      expect(screen.getByText('Sync error')).toBeInTheDocument()
    })
  })

  describe('full variant', () => {
    it('should render toggle button', () => {
      render(<SyncStatusIndicator variant="full" />)
      
      const toggleButton = screen.getByRole('button', { name: /all changes saved/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it('should expand panel when clicked', async () => {
      render(<SyncStatusIndicator variant="full" />)
      
      const toggleButton = screen.getByRole('button', { name: /all changes saved/i })
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument()
      })
    })

    it('should show expanded panel by default when showDetails is true', () => {
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Sync Status')).toBeInTheDocument()
    })

    it('should close panel when X button is clicked', async () => {
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      const closeButton = screen.getByRole('button', { name: '' }) // X button
      fireEvent.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Sync Status')).not.toBeInTheDocument()
      })
    })

    it('should display connection status', () => {
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Connection')).toBeInTheDocument()
      expect(screen.getByText('Online')).toBeInTheDocument()
    })

    it('should display offline status when offline', () => {
      mockUseOfflineSync.isOnline = false
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('should display last sync time', () => {
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Last sync')).toBeInTheDocument()
      expect(screen.getByText('Just now')).toBeInTheDocument()
    })

    it('should display pending items when present', () => {
      mockUseOfflineSync.pendingSurveys = 2
      mockUseOfflineSync.pendingPhotos = 3
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('2 survey(s), 3 photo(s)')).toBeInTheDocument()
    })

    it('should display failed uploads when present', () => {
      mockUseOfflineSync.failedPhotos = 2
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Failed uploads')).toBeInTheDocument()
      expect(screen.getByText('2 photo(s)')).toBeInTheDocument()
    })

    it('should display storage usage', () => {
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Storage used')).toBeInTheDocument()
      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    it('should display error message when present', () => {
      mockUseOfflineSync.lastSyncError = 'Network error occurred'
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      expect(screen.getByText('Network error occurred')).toBeInTheDocument()
    })

    it('should call syncNow when sync button is clicked', () => {
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      const syncButton = screen.getByRole('button', { name: /sync now/i })
      fireEvent.click(syncButton)
      
      expect(mockUseOfflineSync.syncNow).toHaveBeenCalledTimes(1)
    })

    it('should disable sync button when offline', () => {
      mockUseOfflineSync.isOnline = false
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      const syncButton = screen.getByRole('button', { name: /sync now/i })
      expect(syncButton).toBeDisabled()
    })

    it('should disable sync button when syncing', () => {
      mockUseOfflineSync.status = 'syncing'
      render(<SyncStatusIndicator variant="full" showDetails={true} />)

      // The "Sync Now" button inside the panel should be disabled when syncing
      // It shows "Syncing..." text when syncing
      const buttons = screen.getAllByRole('button')
      // Find the button within the panel (not the toggle button)
      // It should contain "Syncing..." with an animated spinner icon
      const syncActionButton = buttons.find(btn => {
        const hasSpinner = btn.querySelector('.animate-spin')
        const hasSyncText = btn.textContent?.includes('Syncing')
        // The toggle button also has "Syncing" but doesn't have the spinner as child
        const isInPanel = btn.closest('.absolute')
        return hasSpinner && hasSyncText && isInPanel
      })
      expect(syncActionButton).toBeDefined()
      expect(syncActionButton).toBeDisabled()
    })

    it('should show retry button when there are errors', () => {
      mockUseOfflineSync.failedPhotos = 2
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      const retryButton = screen.getByRole('button', { name: /retry failed uploads/i })
      expect(retryButton).toBeInTheDocument()
    })

    it('should call retryFailed when retry button is clicked', () => {
      mockUseOfflineSync.failedPhotos = 2
      render(<SyncStatusIndicator variant="full" showDetails={true} />)
      
      const retryButton = screen.getByRole('button', { name: /retry failed uploads/i })
      fireEvent.click(retryButton)
      
      expect(mockUseOfflineSync.retryFailed).toHaveBeenCalledTimes(1)
    })
  })
})

describe('InlineSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockUseOfflineSync, {
      status: 'synced' as const,
      isOnline: true,
      pendingSurveys: 0,
      pendingPhotos: 0,
      failedPhotos: 0,
    })
  })

  it('should show offline indicator when offline', () => {
    mockUseOfflineSync.isOnline = false
    render(<InlineSyncStatus />)
    
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('should show syncing indicator when syncing', () => {
    mockUseOfflineSync.status = 'syncing'
    render(<InlineSyncStatus />)
    
    // Should have spinning loader (tested via class)
    const loader = document.querySelector('.animate-spin')
    expect(loader).toBeInTheDocument()
  })

  it('should show pending indicator when there are pending photos', () => {
    mockUseOfflineSync.status = 'pending'
    mockUseOfflineSync.pendingPhotos = 3
    render(<InlineSyncStatus />)
    
    expect(screen.getByText('3 pending')).toBeInTheDocument()
  })

  it('should show failed uploads as clickable button', () => {
    mockUseOfflineSync.failedPhotos = 2
    render(<InlineSyncStatus />)
    
    const failedButton = screen.getByRole('button', { name: /2 failed/i })
    expect(failedButton).toBeInTheDocument()
  })

  it('should call syncNow when failed uploads button is clicked', () => {
    mockUseOfflineSync.failedPhotos = 2
    render(<InlineSyncStatus />)
    
    const failedButton = screen.getByRole('button', { name: /2 failed/i })
    fireEvent.click(failedButton)
    
    expect(mockUseOfflineSync.syncNow).toHaveBeenCalledTimes(1)
  })

  it('should show saved indicator when synced and online', () => {
    render(<InlineSyncStatus />)
    
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })
})