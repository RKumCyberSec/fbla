import { useAuth } from '@clerk/expo'
import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BlurView } from 'expo-blur'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Pressable,
  View,
  LayoutChangeEvent,
} from 'react-native'

type TabBarAnimationContextType = {
  setCollapsed: (collapsed: boolean) => void
}

const TabBarAnimationContext = createContext<TabBarAnimationContextType>({
  setCollapsed: () => {},
})

export function useTabBarAnimation() {
  return useContext(TabBarAnimationContext)
}

function TabBarIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap
  focused: boolean
  color: string
}) {
  const scale = useRef(new Animated.Value(focused ? 1.15 : 1)).current

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.18 : 1,
      useNativeDriver: true,
      friction: 7,
      tension: 120,
    }).start()
  }, [focused, scale])

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={name} size={24} color={color} />
    </Animated.View>
  )
}

function CustomTabBar({ state, navigation, collapsed }: any) {
  const [barWidth, setBarWidth] = useState(0)
  const indicatorX = useRef(new Animated.Value(0)).current
  const barScale = useRef(new Animated.Value(1)).current
  const barTranslateY = useRef(new Animated.Value(0)).current

  const tabWidth = barWidth > 0 ? barWidth / state.routes.length : 0

  useEffect(() => {
    if (!tabWidth) return

    Animated.spring(indicatorX, {
      toValue: state.index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start()
  }, [state.index, tabWidth, indicatorX])

  useEffect(() => {
    Animated.parallel([
      Animated.spring(barScale, {
        toValue: collapsed ? 0.78 : 1,
        useNativeDriver: true,
        friction: 8,
        tension: 120,
      }),
      Animated.spring(barTranslateY, {
        toValue: collapsed ? 18 : 0,
        useNativeDriver: true,
        friction: 8,
        tension: 120,
      }),
    ]).start()
  }, [collapsed, barScale, barTranslateY])

  const getIconName = (routeName: string, focused: boolean) => {
    switch (routeName) {
      case 'calendar':
        return focused ? 'calendar' : 'calendar-outline'
      case 'resources':
        return focused ? 'folder' : 'folder-outline'
      case 'index':
        return focused ? 'home' : 'home-outline'
      case 'feed':
        return focused ? 'newspaper' : 'newspaper-outline'
      case 'profile':
        return focused ? 'person' : 'person-outline'
      default:
        return 'ellipse-outline'
    }
  }

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 20,
        transform: [{ scale: barScale }, { translateY: barTranslateY }],
      }}
    >
      <View
        onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
        style={{
          height: 74,
          borderRadius: 28,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.45)',
          backgroundColor: 'rgba(225, 227, 241, 0.55)',
        }}
      >
        <BlurView intensity={55} tint="light" style={{ flex: 1 }}>
          {tabWidth > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                top: 10,
                left: 0,
                width: tabWidth,
                height: 54,
                transform: [{ translateX: indicatorX }],
                paddingHorizontal: 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.78)',
                }}
              />
            </Animated.View>
          )}

          <View style={{ flex: 1, flexDirection: 'row' }}>
            {state.routes.map((route: any, index: number) => {
              const isFocused = state.index === index
              const color = isFocused ? '#111827' : '#6B7280'

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                })

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name)
                }
              }

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={{
                    flex: 1,
                    height: 74,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TabBarIcon
                    name={getIconName(route.name, isFocused)}
                    focused={isFocused}
                    color={color}
                  />
                </Pressable>
              )
            })}
          </View>
        </BlurView>
      </View>
    </Animated.View>
  )
}

export default function HomeLayout() {
  const { isSignedIn, isLoaded } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  if (!isLoaded) return null

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />
  }

  return (
    <TabBarAnimationContext.Provider value={{ setCollapsed }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} collapsed={collapsed} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="calendar" />
        <Tabs.Screen name="resources" />
        <Tabs.Screen name="index" />
        <Tabs.Screen name="feed" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </TabBarAnimationContext.Provider>
  )
}