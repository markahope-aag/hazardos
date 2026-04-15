'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

interface Customer {
  id: string
  name: string | null
  company_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
}

interface CustomerComboboxProps {
  value: string
  onValueChange: (value: string) => void
  onCustomerSelect?: (customer: Customer) => void
  placeholder?: string
  disabled?: boolean
}

const SELECT_COLUMNS =
  'id, name, company_name, first_name, last_name, email, phone, address_line1, city, state, zip'

export function CustomerCombobox({
  value,
  onValueChange,
  onCustomerSelect,
  placeholder = 'Select customer...',
  disabled = false
}: CustomerComboboxProps) {
  const { organization } = useMultiTenantAuth()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // Load selected customer details if value is set
  useEffect(() => {
    if (value && !selectedCustomer) {
      const loadCustomer = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from('customers')
          .select(SELECT_COLUMNS)
          .eq('id', value)
          .single()

        if (data) {
          setSelectedCustomer(data)
        }
      }
      loadCustomer()
    }
  }, [value, selectedCustomer])

  // Search customers
  useEffect(() => {
    if (!organization?.id) return

    const searchCustomers = async () => {
      setIsLoading(true)
      const supabase = createClient()

      let query = supabase
        .from('customers')
        .select(SELECT_COLUMNS)
        .eq('organization_id', organization.id)
        .neq('status', 'inactive')
        .order('updated_at', { ascending: false })
        .limit(20)

      if (search) {
        const escaped = search.replace(/[%,]/g, ' ')
        query = query.or(
          `name.ilike.%${escaped}%,company_name.ilike.%${escaped}%,first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
        )
      }

      const { data } = await query
      setCustomers(data || [])
      setIsLoading(false)
    }

    const debounce = setTimeout(searchCustomers, 300)
    return () => clearTimeout(debounce)
  }, [search, organization?.id])

  const getDisplayName = (customer: Customer) => {
    if (customer.company_name) return customer.company_name
    const personName = [customer.first_name, customer.last_name].filter(Boolean).join(' ')
    return personName || customer.name || 'Unnamed'
  }

  const handleSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    if (customer) {
      setSelectedCustomer(customer)
      onValueChange(customer.id)
      onCustomerSelect?.(customer)
    }
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedCustomer ? getDisplayName(selectedCustomer) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search customers..."
            value={search}
            onValueChange={setSearch}
            aria-label="Search customers by name or company"
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? 'Searching...' : 'No customers found.'}
            </CommandEmpty>
            <CommandGroup>
              {customers.map((customer) => (
                <CommandItem
                  key={customer.id}
                  value={customer.id}
                  onSelect={handleSelect}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === customer.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{getDisplayName(customer)}</span>
                    {customer.address_line1 && (
                      <span className="text-sm text-muted-foreground">
                        {customer.address_line1}
                        {customer.city ? `, ${customer.city}` : ''}
                        {customer.state ? ` ${customer.state}` : ''}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
