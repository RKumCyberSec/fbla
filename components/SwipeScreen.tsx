import React, { ReactNode, useMemo } from 'react'
import { PanResponder, View } from 'react-native'
import { usePathname, useRouter } from 'expo-router'

const routes = [
  '/calendar',
  '/resources',
  '/',
  '/feed',
  '/profile',
]

export default function SwipeScreen({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const currentIndex = useMemo(() => {
    const normalized = pathname === '/index' ? '/' : pathname
    const foundIndex = routes.indexOf(normalized)
    return foundIndex === -1 ? 2 : foundIndex
  }, [pathname])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return (
            Math.abs(gestureState.dx) > 20 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
          )
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -60) {
            const nextIndex = Math.min(currentIndex + 1, routes.length - 1)
            if (nextIndex !== currentIndex) {
              router.replace(routes[nextIndex] as any)
            }
          } else if (gestureState.dx > 60) {
            const prevIndex = Math.max(currentIndex - 1, 0)
            if (prevIndex !== currentIndex) {
              router.replace(routes[prevIndex] as any)
            }
          }
        },
      }),
    [currentIndex, router]
  )

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  )
}