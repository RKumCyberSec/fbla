import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Image } from 'react-native'
import {
  Animated,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native'

import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Bell, ChevronRight, Heart, Pin, Share2 } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import SwipeScreen from '@/components/SwipeScreen'
import { useTabBarAnimation } from './_layout'
import HeroCard from '@/components/HeroCard'

type NewsCategory =
  | 'announcement'
  | 'spotlight'
  | 'competition'
  | 'chapter'
  | 'national'

type NewsItem = {
  id: string
  title: string
  summary: string
  category: NewsCategory
  publishedAt: string
  author: string
  authorAvatar: string
  imageUrl?: string
  likes: number
  isLiked: boolean
  isPinned?: boolean
}

const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'State Leadership Conference registration opens next week',
    summary:
      'Review deadlines, chapter requirements, and reminders before registration begins. Key documents will be posted in Resources.',
    category: 'announcement',
    publishedAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    author: 'FBLA National',
    authorAvatar: 'https://i.pravatar.cc/100?img=11',
    imageUrl: 'https://picsum.photos/seed/fbla1/1200/900',
    likes: 148,
    isLiked: false,
    isPinned: true,
  },
  {
    id: '2',
    title: 'Chapter Spotlight: Desert Ridge launches new outreach initiative',
    summary:
      'Members partnered with local organizations to build a student leadership and entrepreneurship event for their community.',
    category: 'spotlight',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    author: 'Arizona FBLA',
    authorAvatar: 'https://i.pravatar.cc/100?img=24',
    imageUrl: 'https://picsum.photos/seed/fbla2/1200/900',
    likes: 86,
    isLiked: true,
  },
  {
    id: '3',
    title: 'Updated competitive event guidelines now available',
    summary:
      'Several categories have revised submission details and judging criteria. Members should review updates before preparing.',
    category: 'competition',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    author: 'Competition Board',
    authorAvatar: 'https://i.pravatar.cc/100?img=35',
    likes: 203,
    isLiked: false,
  },
  {
    id: '4',
    title: 'National leadership update for chapter officers',
    summary:
      'This month’s officer briefing covers membership engagement, chapter communication, and event readiness for the spring cycle.',
    category: 'national',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    author: 'FBLA National',
    authorAvatar: 'https://i.pravatar.cc/100?img=19',
    imageUrl: 'https://picsum.photos/seed/fbla3/1200/900',
    likes: 119,
    isLiked: false,
  },
]

const CATEGORY_STYLES: Record<
  NewsCategory,
  { bg: string; text: string; label: string }
> = {
  announcement: {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    label: 'Announcement',
  },
  spotlight: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Spotlight',
  },
  competition: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Competition',
  },
  chapter: {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    label: 'Chapter',
  },
  national: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    label: 'National',
  },
}

function formatTimeAgo(dateString: string) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getDaysUntilSLC() {
  const slcDate = new Date('2026-03-25T00:00:00')
  const now = new Date()
  const diff = slcDate.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return Math.max(days, 0)
}



function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className={`mr-2 rounded-full px-4 py-2.5 ${
        active ? 'bg-zinc-900' : 'bg-white'
      }`}
    >
      <Text
        className={`text-[13px] font-medium ${
          active ? 'text-white' : 'text-zinc-600'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function NewsCard({
  item,
  onPress,
}: {
  item: NewsItem
  onPress: () => void
}) {
  const [liked, setLiked] = useState(item.isLiked)
  const [likeCount, setLikeCount] = useState(item.likes)
  const scaleAnim = useRef(new Animated.Value(1)).current
  const heartScale = useRef(new Animated.Value(1)).current

  const categoryStyle = CATEGORY_STYLES[item.category]

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.985,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 70,
        useNativeDriver: true,
      }),
    ]).start()
    onPress()
  }, [onPress, scaleAnim])

  const handleLike = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.22,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start()

    setLiked((prev) => !prev)
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1))
  }, [heartScale, liked])

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.92}
        className="mb-4 overflow-hidden rounded-[28px] bg-white"
      >
        {item.isPinned ? (
          <View className="flex-row items-center px-5 pt-4">
            <Pin size={12} color="#A16207" />
            <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-amber-700">
              Pinned
            </Text>
          </View>
        ) : null}

        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            className="mt-3 h-[210px] w-full"
            resizeMode="cover"
          />
        ) : null}

        <View className="px-5 pb-5 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className={`rounded-full px-3 py-1.5 ${categoryStyle.bg}`}>
              <Text className={`text-[11px] font-semibold ${categoryStyle.text}`}>
                {categoryStyle.label}
              </Text>
            </View>

            <Text className="text-[12px] text-zinc-400">
              {formatTimeAgo(item.publishedAt)}
            </Text>
          </View>

          <Text className="text-[19px] font-semibold leading-7 tracking-tight text-zinc-900">
            {item.title}
          </Text>

          <Text className="mt-2 text-[14px] leading-6 text-zinc-600">
            {item.summary}
          </Text>

          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Image
                source={{ uri: item.authorAvatar }}
                className="h-7 w-7 rounded-full"
              />
              <Text className="ml-2 text-[12px] font-medium text-zinc-500">
                {item.author}
              </Text>
            </View>

            <View className="flex-row items-center">
              <TouchableOpacity
                onPress={handleLike}
                activeOpacity={0.8}
                className="mr-4 flex-row items-center"
              >
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart
                    size={18}
                    color={liked ? '#ef4444' : '#71717a'}
                    fill={liked ? '#ef4444' : 'none'}
                  />
                </Animated.View>
                <Text
                  className={`ml-1.5 text-[13px] ${
                    liked ? 'text-red-500' : 'text-zinc-500'
                  }`}
                >
                  {likeCount}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.8} className="p-1">
                <Share2 size={17} color="#71717a" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'all' | NewsCategory>('all')
  const headerOpacity = useRef(new Animated.Value(0)).current
  const { setCollapsed } = useTabBarAnimation()
  const lastY = useRef(0)

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [headerOpacity])

  const filters: Array<'all' | NewsCategory> = [
    'all',
    'announcement',
    'competition',
    'spotlight',
    'chapter',
    'national',
  ]

  const filteredNews = useMemo(() => {
    return selectedFilter === 'all'
      ? mockNews
      : mockNews.filter((n) => n.category === selectedFilter)
  }, [selectedFilter])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }, [])

  const handleNewsPress = useCallback(
    (item: NewsItem) => {
      router.push({ pathname: '/news-detail', params: { id: item.id } })
    },
    [router]
  )

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y

    if (y <= 0) {
      setCollapsed(false)
      lastY.current = y
      return
    }

    if (y > lastY.current + 4) {
      setCollapsed(true)
    } else if (y < lastY.current - 4) {
      setCollapsed(false)
    }

    lastY.current = y
  }

  return (
    <SwipeScreen>
      <View className="flex-1 bg-zinc-100">
        <Animated.View
          style={{ opacity: headerOpacity, paddingTop: insets.top + 8 }}
          className="px-5 pb-4"
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-[13px] font-medium text-zinc-500">
                Welcome back
              </Text>
              <Text className="mt-1 text-[30px] font-semibold tracking-tight text-zinc-900">
                FBLA Connect
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              className="h-11 w-11 items-center justify-center rounded-full bg-zinc-900"
            >
              <Bell size={20} color="white" />
              <View className="absolute right-[11px] top-[10px] h-2.5 w-2.5 rounded-full border border-zinc-900 bg-orange-400" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 28 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#111827"
            />
          }
        >
          <View className="px-4">
            <HeroCard/>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-5"
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {filters.map((filter) => (
                <FilterChip
                  key={filter}
                  label={
                    filter === 'all'
                      ? 'All'
                      : filter.charAt(0).toUpperCase() + filter.slice(1)
                  }
                  active={selectedFilter === filter}
                  onPress={() => {
                    setSelectedFilter(filter)
                    if (Platform.OS !== 'web') {
                      void Haptics.selectionAsync()
                    }
                  }}
                />
              ))}
            </ScrollView>

            <View className="mb-3 flex-row items-center justify-between px-1">
              <Text className="text-[20px] font-semibold tracking-tight text-zinc-900">
                Latest Updates
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                className="flex-row items-center"
              >
                <Text className="mr-1 text-[13px] font-medium text-zinc-500">
                  See All
                </Text>
                <ChevronRight size={14} color="#71717a" />
              </TouchableOpacity>
            </View>

            {filteredNews.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                onPress={() => handleNewsPress(item)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </SwipeScreen>
  )
}