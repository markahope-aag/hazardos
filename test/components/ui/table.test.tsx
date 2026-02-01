import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

describe('Table Components', () => {
  it('should render basic table structure', () => {
    render(
      <Table>
        <TableCaption>A list of recent invoices</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell className="text-right">$250.00</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">INV002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell>PayPal</TableCell>
            <TableCell className="text-right">$150.00</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3}>Total</TableCell>
            <TableCell className="text-right">$400.00</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    // Check table structure
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(table).toHaveClass('w-full', 'caption-bottom', 'text-sm')

    // Check caption
    const caption = screen.getByText('A list of recent invoices')
    expect(caption).toBeInTheDocument()

    // Check headers
    expect(screen.getByRole('columnheader', { name: /invoice/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /method/i })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /amount/i })).toBeInTheDocument()

    // Check data cells
    expect(screen.getByRole('cell', { name: /inv001/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /paid/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /credit card/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /\$250\.00/i })).toBeInTheDocument()

    expect(screen.getByRole('cell', { name: /inv002/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /pending/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /paypal/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /\$150\.00/i })).toBeInTheDocument()

    // Check footer
    expect(screen.getByRole('cell', { name: /total/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /\$400\.00/i })).toBeInTheDocument()
  })

  it('should render empty table', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell colSpan={2} className="text-center">
              No data available
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByText('No data available')).toBeInTheDocument()
  })

  it('should apply custom classes correctly', () => {
    render(
      <Table className="custom-table">
        <TableHeader className="custom-header">
          <TableRow className="custom-row">
            <TableHead className="custom-head">Header</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="custom-body">
          <TableRow className="custom-data-row">
            <TableCell className="custom-cell">Data</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter className="custom-footer">
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
        <TableCaption className="custom-caption">Caption</TableCaption>
      </Table>
    )

    const table = screen.getByRole('table')
    expect(table).toHaveClass('custom-table')

    const header = screen.getByRole('columnheader', { name: /header/i })
    expect(header).toHaveClass('custom-head')

    const cell = screen.getByRole('cell', { name: /^data$/i })
    expect(cell).toHaveClass('custom-cell')

    const caption = screen.getByText('Caption')
    expect(caption).toHaveClass('custom-caption')
  })

  it('should handle table with no caption', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column 1</TableHead>
            <TableHead>Column 2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Value 1</TableCell>
            <TableCell>Value 2</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /column 1/i })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: /value 1/i })).toBeInTheDocument()
  })

  it('should handle table with no footer', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>John</TableCell>
            <TableCell>25</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Jane</TableCell>
            <TableCell>30</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(3) // 1 header + 2 data rows
  })

  it('should render table with complex data', () => {
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
      { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Editor' },
    ]

    render(
      <Table>
        <TableCaption>User Management Table</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )

    // Check all users are rendered
    users.forEach((user) => {
      expect(screen.getByRole('cell', { name: user.id.toString() })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: user.name })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: user.email })).toBeInTheDocument()
      expect(screen.getByRole('cell', { name: user.role })).toBeInTheDocument()
    })

    // Check total number of rows (1 header + 3 data rows)
    expect(screen.getAllByRole('row')).toHaveLength(4)
  })

  it('should handle table head with different scope', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Product</TableHead>
            <TableHead scope="col">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableHead scope="row">Laptop</TableHead>
            <TableCell>$999</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const productHeader = screen.getByRole('columnheader', { name: /product/i })
    expect(productHeader).toHaveAttribute('scope', 'col')

    const laptopHeader = screen.getByRole('rowheader', { name: /laptop/i })
    expect(laptopHeader).toHaveAttribute('scope', 'row')
  })

  it('should be accessible with proper ARIA attributes', () => {
    render(
      <Table aria-label="Customer data table">
        <TableCaption>List of customers and their information</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Customer Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Acme Corp</TableCell>
            <TableCell>Active</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )

    const table = screen.getByRole('table', { name: /customer data table/i })
    expect(table).toBeInTheDocument()
    expect(table).toHaveAttribute('aria-label', 'Customer data table')
  })
})