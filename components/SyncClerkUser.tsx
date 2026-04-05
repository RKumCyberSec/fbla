import React, { useEffect, useRef } from 'react'
import { useUser } from '@clerk/expo'
import { syncUserToSupabase } from '@/lib/syncUserToSupabase'

export default function SyncClerkUser() {
  const { isLoaded, isSignedIn, user } = useUser()
  const syncedRef = useRef(false)

  useEffect(() => {
    const run = async () => {
      console.log('SyncClerkUser fired', {
        isLoaded,
        isSignedIn,
        userId: user?.id,
      })

      if (!isLoaded || !isSignedIn || !user || syncedRef.current) return

      try {
        await syncUserToSupabase(user)
        console.log('User synced to Supabase')
        syncedRef.current = true
      } catch (err) {
        console.error('Failed syncing user to Supabase:', err)
      }
    }

    run()
  }, [isLoaded, isSignedIn, user])

  return null
}