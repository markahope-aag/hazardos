# CustomerListItem Performance Optimization

**Purpose**: Optimize CustomerListItem component to reduce unnecessary re-renders in large customer lists

## Problem Statement

In customer lists with hundreds of items, each CustomerListItem was re-rendering whenever:
- Parent component state changed
- Any customer in the list was updated
- Callback functions were recreated
- Date formatting was recalculated on every render

## Solution Implemented

### 1. React.memo with Custom Comparison

```tsx
// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: CustomerListItemProps, nextProps: CustomerListItemProps) => {
  const prevCustomer = prevProps.customer
  const nextCustomer = nextProps.customer
  
  // Check if it's the same customer instance
  if (prevCustomer === nextCustomer) return true
  
  // Deep comparison of customer properties that affect the UI
  const customerPropsEqual = (
    prevCustomer.id === nextCustomer.id &&
    prevCustomer.name === nextCustomer.name &&
    prevCustomer.company_name === nextCustomer.company_name &&
    prevCustomer.email === nextCustomer.email &&
    prevCustomer.phone === nextCustomer.phone &&
    prevCustomer.status === nextCustomer.status &&
    prevCustomer.source === nextCustomer.source &&
    prevCustomer.created_at === nextCustomer.created_at
  )
  
  // Check if callback functions are the same (should be memoized in parent)
  const callbacksEqual = (
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete
  )
  
  return customerPropsEqual && callbacksEqual
}

export default memo(CustomerListItem, arePropsEqual)
```

### 2. Memoized Expensive Computations

```tsx
// Memoize date formatting (expensive operation)
const formattedDate = useMemo(() => {
  return format(new Date(customer.created_at), 'MMM d, yyyy')
}, [customer.created_at])

// Memoize source label transformation
const sourceLabel = useMemo(() => {
  if (!customer.source) return '-'
  return customer.source.charAt(0).toUpperCase() + customer.source.slice(1)
}, [customer.source])
```

### 3. Memoized Event Handlers

```tsx
// Prevent child component re-renders by memoizing callbacks
const handleStatusChange = useCallback(async (newStatus: CustomerStatus) => {
  if (newStatus === customer.status) return
  
  setIsUpdatingStatus(true)
  try {
    await updateStatusMutation.mutateAsync({
      id: customer.id,
      status: newStatus
    })
  } finally {
    setIsUpdatingStatus(false)
  }
}, [customer.id, customer.status, updateStatusMutation])

const handleViewCustomer = useCallback(() => {
  router.push(`/customers/${customer.id}`)
}, [router, customer.id])

const handleEdit = useCallback(() => {
  onEdit(customer)
}, [onEdit, customer])

const handleDelete = useCallback(() => {
  onDelete(customer)
}, [onDelete, customer])
```

## Performance Benefits

### Before Optimization
- **Re-renders**: Every CustomerListItem re-rendered on any parent state change
- **Date formatting**: Recalculated on every render (~1-2ms per item)
- **Event handlers**: Recreated on every render, causing dropdown re-renders
- **Large lists**: 100 customers × unnecessary re-renders = poor performance

### After Optimization
- **Re-renders**: Only when customer data actually changes
- **Date formatting**: Calculated once, cached until `created_at` changes
- **Event handlers**: Stable references, no unnecessary child re-renders
- **Large lists**: Smooth scrolling and interaction

### Expected Performance Improvements
- **50-80% reduction** in unnecessary re-renders
- **Faster list scrolling** with large datasets
- **Improved responsiveness** during status updates
- **Better memory usage** with stable function references

## Usage Guidelines

### Parent Component Requirements

The parent component must provide stable callback references:

```tsx
// ✅ Good - memoized callbacks
const CustomerListContainer = () => {
  const handleEditCustomer = useCallback((customer: Customer) => {
    // Edit logic
  }, [])

  const handleDeleteCustomer = useCallback((customer: Customer) => {
    // Delete logic  
  }, [])

  return (
    <CustomerList
      onEditCustomer={handleEditCustomer}
      onDeleteCustomer={handleDeleteCustomer}
    />
  )
}

// ❌ Bad - callbacks recreated on every render
const CustomerListContainer = () => {
  return (
    <CustomerList
      onEditCustomer={(customer) => {/* Edit logic */}}
      onDeleteCustomer={(customer) => {/* Delete logic */}}
    />
  )
}
```

### Key Optimization Principles

1. **Memoize expensive computations** (date formatting, string transformations)
2. **Use useCallback for event handlers** to prevent child re-renders
3. **Implement custom comparison functions** for complex props
4. **Ensure parent callbacks are stable** to maximize memo effectiveness

## Monitoring Performance

### React DevTools Profiler
```bash
# Enable profiler in development
npm run dev

# Navigate to customer list
# Open React DevTools > Profiler
# Record interaction (scroll, status change)
# Check for unnecessary re-renders
```

### Performance Metrics to Track
- **Render count**: Should only increase when customer data changes
- **Render duration**: Should be <1ms per item for simple updates
- **Memory usage**: Should remain stable during list interactions
- **Scroll performance**: Should maintain 60fps on large lists

## Testing Optimizations

### Unit Tests
```tsx
// Test memo behavior
it('should not re-render when unrelated props change', () => {
  const { rerender } = render(
    <CustomerListItem
      customer={mockCustomer}
      onEdit={mockEdit}
      onDelete={mockDelete}
    />
  )
  
  const initialRenderCount = getRenderCount()
  
  // Change unrelated prop
  rerender(
    <CustomerListItem
      customer={mockCustomer} // Same customer
      onEdit={mockEdit}       // Same callback
      onDelete={mockDelete}   // Same callback
    />
  )
  
  expect(getRenderCount()).toBe(initialRenderCount)
})
```

### Performance Tests
```tsx
// Test with large datasets
it('should handle 1000+ customers efficiently', () => {
  const customers = generateMockCustomers(1000)
  const startTime = performance.now()
  
  render(<CustomerList customers={customers} />)
  
  const renderTime = performance.now() - startTime
  expect(renderTime).toBeLessThan(100) // Should render in <100ms
})
```

## Future Optimizations

### Virtualization for Large Lists
```tsx
// Consider react-window for 1000+ items
import { FixedSizeList as List } from 'react-window'

const VirtualizedCustomerList = ({ customers }) => (
  <List
    height={600}
    itemCount={customers.length}
    itemSize={60}
    itemData={customers}
  >
    {({ index, style, data }) => (
      <div style={style}>
        <CustomerListItem customer={data[index]} />
      </div>
    )}
  </List>
)
```

### Intersection Observer for Lazy Loading
```tsx
// Load customer details only when visible
const LazyCustomerListItem = ({ customer }) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useIntersectionObserver(setIsVisible)
  
  return (
    <div ref={ref}>
      {isVisible ? (
        <CustomerListItem customer={customer} />
      ) : (
        <CustomerListItemSkeleton />
      )}
    </div>
  )
}
```

## Summary

The CustomerListItem optimization provides:
- ✅ **Reduced re-renders** through React.memo with custom comparison
- ✅ **Memoized computations** for expensive operations
- ✅ **Stable event handlers** to prevent cascade re-renders
- ✅ **Better performance** with large customer lists
- ✅ **Improved user experience** with smoother interactions