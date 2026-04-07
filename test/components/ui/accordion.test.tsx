import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui/accordion'

describe('Accordion', () => {
  it('should render accordion with single item', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Test Trigger</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    expect(screen.getByText('Test Trigger')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render accordion with multiple items', () => {
    render(
      <Accordion type="multiple" defaultValue={['item-1', 'item-2']}>
        <AccordionItem value="item-1">
          <AccordionTrigger>First Item</AccordionTrigger>
          <AccordionContent>First Content</AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Second Item</AccordionTrigger>
          <AccordionContent>Second Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    expect(screen.getByText('First Item')).toBeInTheDocument()
    expect(screen.getByText('First Content')).toBeInTheDocument()
    expect(screen.getByText('Second Item')).toBeInTheDocument()
    expect(screen.getByText('Second Content')).toBeInTheDocument()
  })

  it('should apply custom className to AccordionItem', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1" className="custom-item-class" data-testid="accordion-item">
          <AccordionTrigger>Test Trigger</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    const item = screen.getByTestId('accordion-item')
    expect(item).toHaveClass('custom-item-class')
  })

  it('should apply custom className to AccordionTrigger', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger className="custom-trigger-class">Test Trigger</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    const trigger = screen.getByText('Test Trigger')
    expect(trigger).toHaveClass('custom-trigger-class')
  })

  it('should apply custom className to AccordionContent', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Test Trigger</AccordionTrigger>
          <AccordionContent className="custom-content-class">Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    // The custom className is on the inner div (direct parent of text)
    const textNode = screen.getByText('Test Content')
    // The structure is: AccordionPrimitive.Content > div.custom-content-class > text
    expect(textNode.closest('.custom-content-class')).toBeInTheDocument()
  })

  it('should render chevron icon in trigger', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="item-1">
          <AccordionTrigger>Test Trigger</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    // Check for ChevronDown icon (lucide-react renders as svg)
    const svg = screen.getByText('Test Trigger').querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should have correct display names', () => {
    expect(AccordionItem.displayName).toBe('AccordionItem')
    // Display names are set from Radix primitives
    expect(AccordionTrigger.displayName).toBeDefined()
    expect(AccordionContent.displayName).toBeDefined()
  })

  it('should render with default border-b class on AccordionItem', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1" data-testid="bordered-item">
          <AccordionTrigger>Test Trigger</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    const item = screen.getByTestId('bordered-item')
    expect(item).toHaveClass('border-b')
  })

  it('should render content with overflow-hidden class', () => {
    render(
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1">
          <AccordionTrigger>Test Trigger</AccordionTrigger>
          <AccordionContent>Test Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    )

    // The overflow-hidden class is on the AccordionPrimitive.Content element
    const contentContainer = screen.getByText('Test Content').closest('[data-state]')
    expect(contentContainer).toHaveClass('overflow-hidden')
  })
})
