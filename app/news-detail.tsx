import React, { useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'

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
  content?: string[]
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
    content: [
      'Registration for the upcoming State Leadership Conference opens next week.',
      'Members should review chapter requirements, competition deadlines, and travel expectations before submitting registration materials.',
      'Additional conference resources, reminders, and official forms will be available in the Resources section of the app.',
      'Please check back regularly for schedule updates and announcements from your chapter and state leadership team.',
    ],
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
    content: [
      'Desert Ridge FBLA announced a new outreach initiative focused on student leadership and entrepreneurship.',
      'The chapter partnered with local organizations to design an event that helps students connect classroom learning with real-world business skills.',
      'This project highlights how local chapters can make a direct impact in their communities while building stronger engagement among members.',
    ],
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
    content: [
      'Updated competitive event guidelines are now available for the current season.',
      'Members should carefully review the revised judging criteria, submission requirements, and timeline changes before starting preparation.',
      'Advisers and chapter officers are encouraged to share these updates broadly so members can prepare with the most accurate information.',
    ],
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
    content: [
      'This month’s national leadership update focuses on chapter communication, member engagement, and event readiness.',
      'Chapter officers should use this period to strengthen member communication, finalize spring planning, and prepare students for upcoming opportunities.',
      'More leadership tools and communication templates will be added in future updates.',
    ],
  },
]

const CATEGORY_STYLES: Record<
  NewsCategory,
  { bg: string; text: string; label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  announcement: {
    bg: 'bg-sky-100',
    text: 'text-sky-700',
    label: 'Announcement',
    icon: 'megaphone-outline',
  },
  spotlight: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    label: 'Spotlight',
    icon: 'star-outline',
  },
  competition: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    label: 'Competition',
    icon: 'trophy-outline',
  },
  chapter: {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    label: 'Chapter',
    icon: 'people-outline',
  },
  national: {
    bg: 'bg-rose-100',
    text: 'text-rose-700',
    label: 'National',
    icon: 'globe-outline',
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

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export default function NewsDetailPage() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id?: string }>()
  const [liked, setLiked] = useState(false)

  const article = useMemo(() => {
    const found = mockNews.find((item) => item.id === id)
    return found ?? mockNews[0]
  }, [id])

  const categoryStyle = CATEGORY_STYLES[article.category]

  React.useEffect(() => {
    setLiked(article.isLiked)
  }, [article])

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.summary}`,
      })
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-100">
      <View className="border-b border-zinc-200 bg-zinc-100 px-5 pb-4 pt-2">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
          >
            <Ionicons name="chevron-back" size={22} color="#18181b" />
          </Pressable>

          <Text className="text-[17px] font-semibold text-zinc-900">
            Update
          </Text>

          <Pressable
            onPress={handleShare}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
          >
            <Ionicons name="share-outline" size={20} color="#18181b" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-4 pt-4">
          <View className="overflow-hidden rounded-[30px] bg-white">
            {article.imageUrl ? (
              <Image
                source={{ uri: article.imageUrl }}
                className="h-[240px] w-full"
                contentFit="cover"
                transition={180}
              />
            ) : null}

            <View className="px-5 pb-6 pt-5">
              <View className="mb-3 flex-row items-center justify-between">
                <View
                  className={`flex-row items-center rounded-full px-3 py-1.5 ${categoryStyle.bg}`}
                >
                  <Ionicons
                    name={categoryStyle.icon}
                    size={13}
                    color="#111827"
                  />
                  <Text className={`ml-1.5 text-[11px] font-semibold ${categoryStyle.text}`}>
                    {categoryStyle.label}
                  </Text>
                </View>

                <Text className="text-[12px] text-zinc-400">
                  {formatTimeAgo(article.publishedAt)}
                </Text>
              </View>

              {article.isPinned ? (
                <View className="mb-3 flex-row items-center">
                  <Ionicons name="pin-outline" size={13} color="#a16207" />
                  <Text className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.4px] text-amber-700">
                    Pinned
                  </Text>
                </View>
              ) : null}

              <Text className="text-[28px] font-semibold leading-9 tracking-tight text-zinc-900">
                {article.title}
              </Text>

              <Text className="mt-3 text-[15px] leading-7 text-zinc-600">
                {article.summary}
              </Text>

              <View className="mt-5 flex-row items-center justify-between rounded-[22px] bg-zinc-100 px-4 py-4">
                <View className="flex-row items-center">
                  <Image
                    source={{ uri: article.authorAvatar }}
                    className="h-11 w-11 rounded-full"
                    contentFit="cover"
                  />
                  <View className="ml-3">
                    <Text className="text-[14px] font-semibold text-zinc-900">
                      {article.author}
                    </Text>
                    <Text className="text-[12px] text-zinc-500">
                      Published {formatTimeAgo(article.publishedAt)}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() => setLiked((prev) => !prev)}
                  className="flex-row items-center rounded-full bg-white px-4 py-2.5"
                >
                  <Ionicons
                    name={liked ? 'heart' : 'heart-outline'}
                    size={18}
                    color={liked ? '#ef4444' : '#52525b'}
                  />
                  <Text
                    className={`ml-2 text-[13px] font-medium ${
                      liked ? 'text-red-500' : 'text-zinc-600'
                    }`}
                  >
                    {liked ? article.likes + 1 : article.likes}
                  </Text>
                </Pressable>
              </View>

              <View className="mt-6">
                {(article.content ?? [article.summary]).map((paragraph, index) => (
                  <Text
                    key={index}
                    className="mb-4 text-[15px] leading-8 text-zinc-700"
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          <View className="mt-4 rounded-[28px] bg-white p-5">
            <Text className="text-[17px] font-semibold text-zinc-900">
              Related Actions
            </Text>

            <Pressable className="mt-4 flex-row items-center justify-between rounded-[20px] bg-zinc-100 px-4 py-4">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Ionicons name="document-text-outline" size={18} color="#18181b" />
                </View>
                <View className="ml-3">
                  <Text className="text-[14px] font-medium text-zinc-900">
                    View resources
                  </Text>
                  <Text className="text-[12px] text-zinc-500">
                    Related forms and documents
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#71717a" />
            </Pressable>

            <Pressable className="mt-3 flex-row items-center justify-between rounded-[20px] bg-zinc-100 px-4 py-4">
              <View className="flex-row items-center">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Ionicons name="calendar-outline" size={18} color="#18181b" />
                </View>
                <View className="ml-3">
                  <Text className="text-[14px] font-medium text-zinc-900">
                    Add reminder
                  </Text>
                  <Text className="text-[12px] text-zinc-500">
                    Save this update for later
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#71717a" />
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}