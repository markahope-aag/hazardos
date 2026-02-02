import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

describe('Avatar Component', () => {
  it('should render without crashing', () => {
    expect(() =>
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
    ).not.toThrow()
  })

  it('should render avatar fallback text', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('should have default size classes', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const avatar = screen.getByTestId('avatar')
    expect(avatar).toHaveClass('h-10')
    expect(avatar).toHaveClass('w-10')
  })

  it('should have rounded-full class', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    expect(screen.getByTestId('avatar')).toHaveClass('rounded-full')
  })

  it('should accept custom className on Avatar', () => {
    render(
      <Avatar className="h-16 w-16" data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const avatar = screen.getByTestId('avatar')
    expect(avatar).toHaveClass('h-16')
    expect(avatar).toHaveClass('w-16')
  })

  it('should accept custom className on AvatarFallback', () => {
    render(
      <Avatar>
        <AvatarFallback className="bg-blue-500">JD</AvatarFallback>
      </Avatar>
    )

    expect(screen.getByText('JD')).toHaveClass('bg-blue-500')
  })

  it('should render AvatarImage with src', () => {
    render(
      <Avatar>
        <AvatarImage src="/test-avatar.jpg" alt="Test User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', '/test-avatar.jpg')
    expect(img).toHaveAttribute('alt', 'Test User')
  })

  it('should have aspect-square class on AvatarImage', () => {
    render(
      <Avatar>
        <AvatarImage src="/test.jpg" alt="Test" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    expect(screen.getByRole('img')).toHaveClass('aspect-square')
  })

  it('should forward ref on Avatar', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>
    render(
      <Avatar ref={ref}>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should forward ref on AvatarFallback', () => {
    const ref = { current: null } as React.RefObject<HTMLDivElement>
    render(
      <Avatar>
        <AvatarFallback ref={ref}>JD</AvatarFallback>
      </Avatar>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should have overflow-hidden class', () => {
    render(
      <Avatar data-testid="avatar">
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    expect(screen.getByTestId('avatar')).toHaveClass('overflow-hidden')
  })

  it('should center fallback content', () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    )

    const fallback = screen.getByText('JD')
    expect(fallback).toHaveClass('flex')
    expect(fallback).toHaveClass('items-center')
    expect(fallback).toHaveClass('justify-center')
  })
})
