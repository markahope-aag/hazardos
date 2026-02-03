import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock data table component
interface Column<T = any> {
  key: string
  header: string
  accessor?: keyof T | ((row: T) => any)
  sortable?: boolean
  filterable?: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
}

interface DataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  onSort?: (column: string, order: 'asc' | 'desc') => void
  onRowClick?: (row: T) => void
  selectedRows?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
    onPageSizeChange: (pageSize: number) => void
  }
  searchable?: boolean
  onSearch?: (query: string) => void
  emptyMessage?: string
  className?: string
}

const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  sortBy,
  sortOrder = 'asc',
  onSort,
  onRowClick,
  selectedRows = [],
  onSelectionChange,
  pagination,
  searchable = false,
  onSearch,
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps<T>) => {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [localSortBy, setLocalSortBy] = React.useState(sortBy)
  const [localSortOrder, setLocalSortOrder] = React.useState<'asc' | 'desc'>(sortOrder)

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (!column?.sortable) return

    let newOrder: 'asc' | 'desc' = 'asc'
    if (localSortBy === columnKey && localSortOrder === 'asc') {
      newOrder = 'desc'
    }

    setLocalSortBy(columnKey)
    setLocalSortOrder(newOrder)
    onSort?.(columnKey, newOrder)
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onSearch?.(query)
  }

  const handleRowSelection = (rowId: string, checked: boolean) => {
    let newSelection = [...selectedRows]
    if (checked) {
      newSelection.push(rowId)
    } else {
      newSelection = newSelection.filter(id => id !== rowId)
    }
    onSelectionChange?.(newSelection)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = data.map(row => row.id || row.key || String(data.indexOf(row)))
      onSelectionChange?.(allIds)
    } else {
      onSelectionChange?.([])
    }
  }

  const getCellValue = (row: T, column: Column<T>) => {
    if (column.accessor) {
      if (typeof column.accessor === 'function') {
        return column.accessor(row)
      }
      return row[column.accessor]
    }
    return row[column.key as keyof T]
  }

  const renderCell = (row: T, column: Column<T>) => {
    const value = getCellValue(row, column)
    if (column.render) {
      return column.render(value, row)
    }
    return value
  }

  const getSortIcon = (columnKey: string) => {
    if (localSortBy !== columnKey) return '↕️'
    return localSortOrder === 'asc' ? '↑' : '↓'
  }

  const isAllSelected = data.length > 0 && selectedRows.length === data.length
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length

  return (
    <div className={`data-table ${className}`}>
      {/* Search */}
      {searchable && (
        <div className="table-search mb-4">
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input w-full p-2 border rounded"
            aria-label="Search table data"
          />
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="table-loading text-center py-8" role="status" aria-live="polite">
          <div className="spinner">Loading...</div>
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="table-container overflow-x-auto">
            <table className="table w-full border-collapse" role="table">
              <thead>
                <tr role="row">
                  {/* Selection Column */}
                  {onSelectionChange && (
                    <th className="selection-header p-2 border">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate
                        }}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        aria-label="Select all rows"
                      />
                    </th>
                  )}

                  {/* Column Headers */}
                  {columns.map(column => (
                    <th
                      key={column.key}
                      className={`column-header p-2 border ${column.sortable ? 'sortable cursor-pointer hover:bg-gray-50' : ''}`}
                      style={{ width: column.width }}
                      onClick={() => column.sortable && handleSort(column.key)}
                      role="columnheader"
                      aria-sort={
                        localSortBy === column.key
                          ? localSortOrder === 'asc' ? 'ascending' : 'descending'
                          : column.sortable ? 'none' : undefined
                      }
                    >
                      <div className="header-content flex items-center justify-between">
                        <span>{column.header}</span>
                        {column.sortable && (
                          <span className="sort-icon ml-1" aria-hidden="true">
                            {getSortIcon(column.key)}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length + (onSelectionChange ? 1 : 0)}
                      className="empty-message text-center py-8 text-gray-500"
                    >
                      {emptyMessage}
                    </td>
                  </tr>
                ) : (
                  data.map((row, index) => {
                    const rowId = row.id || row.key || String(index)
                    const isSelected = selectedRows.includes(rowId)

                    return (
                      <tr
                        key={rowId}
                        className={`table-row ${isSelected ? 'selected bg-blue-50' : ''} ${onRowClick ? 'clickable cursor-pointer hover:bg-gray-50' : ''}`}
                        onClick={() => onRowClick?.(row)}
                        role="row"
                        aria-selected={onSelectionChange ? isSelected : undefined}
                      >
                        {/* Selection Cell */}
                        {onSelectionChange && (
                          <td className="selection-cell p-2 border">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleRowSelection(rowId, e.target.checked)
                              }}
                              aria-label={`Select row ${index + 1}`}
                            />
                          </td>
                        )}

                        {/* Data Cells */}
                        {columns.map(column => (
                          <td
                            key={column.key}
                            className="table-cell p-2 border"
                            role="gridcell"
                          >
                            {renderCell(row, column)}
                          </td>
                        ))}
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="table-pagination flex items-center justify-between mt-4">
              <div className="pagination-info text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} results
              </div>

              <div className="pagination-controls flex items-center space-x-2">
                <select
                  value={pagination.pageSize}
                  onChange={(e) => pagination.onPageSizeChange(Number(e.target.value))}
                  className="page-size-select p-1 border rounded"
                  aria-label="Rows per page"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>

                <button
                  onClick={() => pagination.onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="prev-button px-2 py-1 border rounded disabled:opacity-50"
                  aria-label="Previous page"
                >
                  Previous
                </button>

                <span className="page-info">
                  Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
                </span>

                <button
                  onClick={() => pagination.onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                  className="next-button px-2 py-1 border rounded disabled:opacity-50"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

describe('DataTable', () => {
  const mockData = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', active: true },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'User', active: false },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'User', active: true }
  ]

  const mockColumns: Column[] = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Role', sortable: false },
    {
      key: 'active',
      header: 'Status',
      render: (value) => (
        <span className={value ? 'text-green-600' : 'text-red-600'}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    }
  ]

  const defaultProps = {
    data: mockData,
    columns: mockColumns
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render table with data', () => {
      render(<DataTable {...defaultProps} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText('jane@example.com')).toBeInTheDocument()
      expect(screen.getByText('User')).toBeInTheDocument()
    })

    it('should render column headers', () => {
      render(<DataTable {...defaultProps} />)
      
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Role')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
    })

    it('should render custom cell content', () => {
      render(<DataTable {...defaultProps} />)
      
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Inactive')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<DataTable {...defaultProps} className="custom-table" />)
      
      const table = screen.getByRole('table').closest('.data-table')
      expect(table).toHaveClass('custom-table')
    })
  })

  describe('empty state', () => {
    it('should show default empty message', () => {
      render(<DataTable data={[]} columns={mockColumns} />)
      
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('should show custom empty message', () => {
      render(
        <DataTable 
          data={[]} 
          columns={mockColumns} 
          emptyMessage="No users found" 
        />
      )
      
      expect(screen.getByText('No users found')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should show loading indicator', () => {
      render(<DataTable {...defaultProps} loading={true} />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should not show table content when loading', () => {
      render(<DataTable {...defaultProps} loading={true} />)
      
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
    })
  })

  describe('sorting', () => {
    it('should show sort icons for sortable columns', () => {
      render(<DataTable {...defaultProps} />)
      
      const nameHeader = screen.getByText('Name').closest('th')
      const emailHeader = screen.getByText('Email').closest('th')
      const roleHeader = screen.getByText('Role').closest('th')
      
      expect(nameHeader).toHaveClass('sortable')
      expect(emailHeader).toHaveClass('sortable')
      expect(roleHeader).not.toHaveClass('sortable')
    })

    it('should call onSort when sortable column is clicked', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      
      render(<DataTable {...defaultProps} onSort={onSort} />)
      
      const nameHeader = screen.getByText('Name').closest('th')!
      await user.click(nameHeader)
      
      expect(onSort).toHaveBeenCalledWith('name', 'asc')
    })

    it('should toggle sort order on repeated clicks', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      
      render(<DataTable {...defaultProps} onSort={onSort} />)
      
      const nameHeader = screen.getByText('Name').closest('th')!
      
      // First click - ascending
      await user.click(nameHeader)
      expect(onSort).toHaveBeenCalledWith('name', 'asc')
      
      // Second click - descending
      await user.click(nameHeader)
      expect(onSort).toHaveBeenCalledWith('name', 'desc')
    })

    it('should show correct sort indicators', () => {
      render(<DataTable {...defaultProps} sortBy="name" sortOrder="asc" />)
      
      const nameHeader = screen.getByText('Name').closest('th')!
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending')
      expect(nameHeader.textContent).toContain('↑')
    })

    it('should not call onSort for non-sortable columns', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      
      render(<DataTable {...defaultProps} onSort={onSort} />)
      
      const roleHeader = screen.getByText('Role').closest('th')!
      await user.click(roleHeader)
      
      expect(onSort).not.toHaveBeenCalled()
    })
  })

  describe('row selection', () => {
    it('should render selection checkboxes when onSelectionChange is provided', () => {
      render(<DataTable {...defaultProps} onSelectionChange={vi.fn()} />)
      
      expect(screen.getByLabelText('Select all rows')).toBeInTheDocument()
      expect(screen.getByLabelText('Select row 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Select row 2')).toBeInTheDocument()
    })

    it('should not render selection checkboxes by default', () => {
      render(<DataTable {...defaultProps} />)
      
      expect(screen.queryByLabelText('Select all rows')).not.toBeInTheDocument()
    })

    it('should call onSelectionChange when row is selected', async () => {
      const user = userEvent.setup()
      const onSelectionChange = vi.fn()
      
      render(<DataTable {...defaultProps} onSelectionChange={onSelectionChange} />)
      
      const firstRowCheckbox = screen.getByLabelText('Select row 1')
      await user.click(firstRowCheckbox)
      
      expect(onSelectionChange).toHaveBeenCalledWith(['1'])
    })

    it('should handle select all functionality', async () => {
      const user = userEvent.setup()
      const onSelectionChange = vi.fn()
      
      render(<DataTable {...defaultProps} onSelectionChange={onSelectionChange} />)
      
      const selectAllCheckbox = screen.getByLabelText('Select all rows')
      await user.click(selectAllCheckbox)
      
      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2', '3'])
    })

    it('should show indeterminate state for partial selection', () => {
      render(
        <DataTable 
          {...defaultProps} 
          selectedRows={['1']} 
          onSelectionChange={vi.fn()} 
        />
      )
      
      const selectAllCheckbox = screen.getByLabelText('Select all rows') as HTMLInputElement
      expect(selectAllCheckbox.indeterminate).toBe(true)
    })

    it('should highlight selected rows', () => {
      render(
        <DataTable 
          {...defaultProps} 
          selectedRows={['1', '2']} 
          onSelectionChange={vi.fn()} 
        />
      )
      
      const rows = screen.getAllByRole('row')
      expect(rows[1]).toHaveClass('selected') // First data row (index 1)
      expect(rows[2]).toHaveClass('selected') // Second data row (index 2)
      expect(rows[3]).not.toHaveClass('selected') // Third data row (index 3)
    })
  })

  describe('row interaction', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      
      render(<DataTable {...defaultProps} onRowClick={onRowClick} />)
      
      const firstRow = screen.getByText('John Doe').closest('tr')!
      await user.click(firstRow)
      
      expect(onRowClick).toHaveBeenCalledWith(mockData[0])
    })

    it('should add clickable styling when onRowClick is provided', () => {
      render(<DataTable {...defaultProps} onRowClick={vi.fn()} />)
      
      const firstRow = screen.getByText('John Doe').closest('tr')!
      expect(firstRow).toHaveClass('clickable')
    })

    it('should not propagate click when checkbox is clicked', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()
      const onSelectionChange = vi.fn()
      
      render(
        <DataTable 
          {...defaultProps} 
          onRowClick={onRowClick}
          onSelectionChange={onSelectionChange}
        />
      )
      
      const firstRowCheckbox = screen.getByLabelText('Select row 1')
      await user.click(firstRowCheckbox)
      
      expect(onSelectionChange).toHaveBeenCalled()
      expect(onRowClick).not.toHaveBeenCalled()
    })
  })

  describe('search functionality', () => {
    it('should render search input when searchable is true', () => {
      render(<DataTable {...defaultProps} searchable={true} />)
      
      expect(screen.getByLabelText('Search table data')).toBeInTheDocument()
    })

    it('should not render search input by default', () => {
      render(<DataTable {...defaultProps} />)
      
      expect(screen.queryByLabelText('Search table data')).not.toBeInTheDocument()
    })

    it('should call onSearch when search input changes', async () => {
      const user = userEvent.setup()
      const onSearch = vi.fn()
      
      render(<DataTable {...defaultProps} searchable={true} onSearch={onSearch} />)
      
      const searchInput = screen.getByLabelText('Search table data')
      await user.type(searchInput, 'john')
      
      expect(onSearch).toHaveBeenCalledWith('john')
    })
  })

  describe('pagination', () => {
    const mockPagination = {
      page: 2,
      pageSize: 10,
      total: 50,
      onPageChange: vi.fn(),
      onPageSizeChange: vi.fn()
    }

    it('should render pagination controls', () => {
      render(<DataTable {...defaultProps} pagination={mockPagination} />)
      
      expect(screen.getByText('Showing 11 to 13 of 50 results')).toBeInTheDocument()
      expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
      expect(screen.getByLabelText('Next page')).toBeInTheDocument()
      expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
    })

    it('should call onPageChange when navigation buttons are clicked', async () => {
      const user = userEvent.setup()
      const onPageChange = vi.fn()
      
      render(
        <DataTable 
          {...defaultProps} 
          pagination={{ ...mockPagination, onPageChange }}
        />
      )
      
      const nextButton = screen.getByLabelText('Next page')
      await user.click(nextButton)
      
      expect(onPageChange).toHaveBeenCalledWith(3)
    })

    it('should disable navigation buttons at boundaries', () => {
      render(
        <DataTable 
          {...defaultProps} 
          pagination={{ ...mockPagination, page: 1 }}
        />
      )
      
      const prevButton = screen.getByLabelText('Previous page')
      expect(prevButton).toBeDisabled()
    })

    it('should call onPageSizeChange when page size is changed', async () => {
      const user = userEvent.setup()
      const onPageSizeChange = vi.fn()
      
      render(
        <DataTable 
          {...defaultProps} 
          pagination={{ ...mockPagination, onPageSizeChange }}
        />
      )
      
      const pageSizeSelect = screen.getByLabelText('Rows per page')
      await user.selectOptions(pageSizeSelect, '25')
      
      expect(onPageSizeChange).toHaveBeenCalledWith(25)
    })
  })

  describe('accessibility', () => {
    it('should have proper table roles', () => {
      render(<DataTable {...defaultProps} />)
      
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('row')).toHaveLength(4) // 1 header + 3 data rows
      expect(screen.getAllByRole('columnheader')).toHaveLength(4)
      expect(screen.getAllByRole('gridcell')).toHaveLength(12) // 3 rows × 4 columns
    })

    it('should have proper ARIA attributes for sorting', () => {
      render(<DataTable {...defaultProps} sortBy="name" sortOrder="desc" />)
      
      const nameHeader = screen.getByRole('columnheader', { name: /name/i })
      expect(nameHeader).toHaveAttribute('aria-sort', 'descending')
    })

    it('should have proper ARIA attributes for selection', () => {
      render(
        <DataTable 
          {...defaultProps} 
          selectedRows={['1']} 
          onSelectionChange={vi.fn()} 
        />
      )
      
      const selectedRow = screen.getByText('John Doe').closest('tr')!
      expect(selectedRow).toHaveAttribute('aria-selected', 'true')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(<DataTable {...defaultProps} searchable={true} />)
      
      // Tab through interactive elements
      await user.tab()
      expect(screen.getByLabelText('Search table data')).toHaveFocus()
      
      await user.tab()
      expect(screen.getByText('Name').closest('th')).toHaveFocus()
    })
  })

  describe('custom column configurations', () => {
    it('should handle custom accessor functions', () => {
      const customColumns: Column[] = [
        {
          key: 'fullName',
          header: 'Full Name',
          accessor: (row) => `${row.name} (${row.role})`
        }
      ]
      
      render(<DataTable data={mockData} columns={customColumns} />)
      
      expect(screen.getByText('John Doe (Admin)')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith (User)')).toBeInTheDocument()
    })

    it('should handle column widths', () => {
      const columnsWithWidth: Column[] = [
        { key: 'name', header: 'Name', width: '200px' },
        { key: 'email', header: 'Email', width: '300px' }
      ]
      
      render(<DataTable data={mockData} columns={columnsWithWidth} />)
      
      const nameHeader = screen.getByText('Name').closest('th')!
      const emailHeader = screen.getByText('Email').closest('th')!
      
      expect(nameHeader).toHaveStyle({ width: '200px' })
      expect(emailHeader).toHaveStyle({ width: '300px' })
    })
  })

  describe('edge cases', () => {
    it('should handle data without id field', () => {
      const dataWithoutId = [
        { name: 'Test User', email: 'test@example.com' }
      ]
      
      render(<DataTable data={dataWithoutId} columns={mockColumns} />)
      
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('should handle undefined callback functions', async () => {
      const user = userEvent.setup()
      
      render(<DataTable {...defaultProps} />)
      
      // Should not throw errors when callbacks are undefined
      const nameHeader = screen.getByText('Name').closest('th')!
      await user.click(nameHeader)
    })

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i),
        name: `User ${i}`,
        email: `user${i}@example.com`,
        role: i % 2 === 0 ? 'Admin' : 'User',
        active: i % 3 === 0
      }))
      
      render(<DataTable data={largeData} columns={mockColumns} />)
      
      expect(screen.getByText('User 0')).toBeInTheDocument()
      expect(screen.getByText('User 999')).toBeInTheDocument()
    })

    it('should handle special characters in data', () => {
      const specialData = [
        {
          id: '1',
          name: 'John "Johnny" O\'Doe',
          email: 'john+test@example.com',
          role: 'Admin & Manager',
          active: true
        }
      ]
      
      render(<DataTable data={specialData} columns={mockColumns} />)
      
      expect(screen.getByText('John "Johnny" O\'Doe')).toBeInTheDocument()
      expect(screen.getByText('john+test@example.com')).toBeInTheDocument()
      expect(screen.getByText('Admin & Manager')).toBeInTheDocument()
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete table workflow', async () => {
      const user = userEvent.setup()
      const onSort = vi.fn()
      const onSearch = vi.fn()
      const onSelectionChange = vi.fn()
      const onRowClick = vi.fn()
      const onPageChange = vi.fn()
      
      render(
        <DataTable
          {...defaultProps}
          searchable={true}
          onSort={onSort}
          onSearch={onSearch}
          onSelectionChange={onSelectionChange}
          onRowClick={onRowClick}
          pagination={{
            page: 1,
            pageSize: 10,
            total: 30,
            onPageChange,
            onPageSizeChange: vi.fn()
          }}
        />
      )
      
      // Search
      const searchInput = screen.getByLabelText('Search table data')
      await user.type(searchInput, 'john')
      expect(onSearch).toHaveBeenCalledWith('john')
      
      // Sort
      const nameHeader = screen.getByText('Name').closest('th')!
      await user.click(nameHeader)
      expect(onSort).toHaveBeenCalledWith('name', 'asc')
      
      // Select row
      const firstRowCheckbox = screen.getByLabelText('Select row 1')
      await user.click(firstRowCheckbox)
      expect(onSelectionChange).toHaveBeenCalledWith(['1'])
      
      // Click row
      const firstRow = screen.getByText('John Doe').closest('tr')!
      await user.click(firstRow)
      expect(onRowClick).toHaveBeenCalledWith(mockData[0])
      
      // Navigate pages
      const nextButton = screen.getByLabelText('Next page')
      await user.click(nextButton)
      expect(onPageChange).toHaveBeenCalledWith(2)
    })
  })
})