import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders placeholder home page', () => {
    render(<App />)
    expect(screen.getByText(/Dream LMS/i)).toBeInTheDocument()
  })

  it('displays version information', () => {
    render(<App />)
    expect(screen.getByText(/Version 0.1.0/i)).toBeInTheDocument()
  })

  it('displays coming soon message', () => {
    render(<App />)
    expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument()
  })
})
