'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'

export default function SetupPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'instructions' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Checking database setup...')
  const [sqlCode, setSqlCode] = useState('')

  useEffect(() => {
    checkSetup()
  }, [])

  const checkSetup = async () => {
    try {
      const response = await fetch('/api/setup', { method: 'POST' })
      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage('Database is ready! Redirecting...')
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 2000)
      } else {
        setStatus('instructions')
        setMessage('Database tables need to be created in Supabase SQL Editor')
        setSqlCode(data.requiredSQL || '')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Failed to check database setup')
    }
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Workspace Setup</h1>
          <p className="mt-2 text-muted-foreground">
            Initializing your chat solution database
          </p>
        </div>

        {status === 'loading' && (
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full border-4 border-border border-t-primary h-12 w-12" />
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </Card>
        )}

        {status === 'success' && (
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-4xl text-green-600">✓</div>
              <div>
                <h2 className="font-semibold text-green-600">Database Ready</h2>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
            </div>
          </Card>
        )}

        {status === 'instructions' && (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold mb-2">Database Setup Required</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Please run the following SQL in your Supabase SQL Editor:
              </p>
            </div>

            <Textarea
              value={sqlCode}
              readOnly
              className="h-96 font-mono text-xs"
            />

            <div className="space-y-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(sqlCode)
                }}
                variant="outline"
                className="w-full"
              >
                Copy SQL to Clipboard
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Then run the SQL in your{' '}
                <a
                  href="https://app.supabase.com/project/_/sql/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Supabase SQL Editor
                </a>
              </p>
              <Button
                onClick={() => {
                  checkSetup()
                }}
                className="w-full"
              >
                Check Again
              </Button>
            </div>
          </Card>
        )}

        {status === 'error' && (
          <Card className="p-6 space-y-4 border-destructive">
            <div>
              <h2 className="font-semibold text-destructive">Error</h2>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
            </div>
            <Button
              onClick={checkSetup}
              className="w-full"
            >
              Try Again
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
