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
  company_name: string | null
  first_name: string
  last_name: string
  address: string | null
  city: string | null
}

interface CustomerComboboxProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CustomerCombobox({
  value,
  onValueChange,
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
          .select('id, company_name, first_name, last_name, address, city')
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
        .select('id, company_name, first_name, last_name, address, city')
        .eq('organization_id', organization.id)
        .neq('status', 'inactive')
        .order('updated_at', { ascending: false })
        .limit(20)

      if (search) {
        query = query.or(
          `company_name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`
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
    if (customer.company_name) {
      return customer.company_name
    }
    return `${customer.first_name} ${customer.last_name}`
  }

  const handleSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId)
    if (customer) {
      setSelectedCustomer(customer)
      onValueChange(customer.id)
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
                    {customer.address && (
                      <span className="text-sm text-muted-foreground">
                        {customer.address}{customer.city ? `, ${customer.city}` : ''}
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
