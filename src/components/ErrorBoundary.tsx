import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex-1 flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-2 break-all">
              {this.state.error?.message ?? 'Unknown error'}
            </p>
            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex h-9 px-4 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                Reload
              </button>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="inline-flex h-9 px-4 items-center justify-center rounded-md border border-input bg-background text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
