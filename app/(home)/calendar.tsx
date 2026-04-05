import { Ionicons } from '@expo/vector-icons'
import { useUser } from '@clerk/expo'
import React, { useMemo, useState } from 'react'
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import SwipeScreen from '@/components/SwipeScreen'

type FeedFilter = 'All' | 'Posts' | 'Announcements'

const POSTS = [
  {
    id: 'post-1',
    title: 'Registration Open for State Leadership Conference',
    body: 'Get ready for one of the biggest FBLA events of the year. Stay on top of deadlines, updates, and chapter preparation.',
    meta: '2 hours ago · FBLA News',
  },
  {
    id: 'post-2',
    title: 'Chapter Officer Spotlight',
    body: 'See how student leaders are building confidence, communication, and competitive success through FBLA.',
    meta: '5 hours ago · Leadership',
  },
]

const ANNOUNCEMENTS = [
  {
    id: 'announce-1',
    title: 'New Competitive Event Guidelines Released',
    body: 'Updated rubrics and preparation resources are now available for members.',
    tag: 'UPDATE',
  },
  {
    id: 'announce-2',
    title: 'Monthly Chapter Meeting This Friday',
    body: 'Be ready with your notes, project updates, and event questions.',
    tag: 'REMINDER',
  },
]

const FEED_FILTERS: FeedFilter[] = ['All', 'Posts', 'Announcements']

const EVENT_CALENDAR = [
  { day: 'Tue, Mar 18', label: 'Opening Session + Networking' },
  { day: 'Wed, Mar 19', label: 'Competition Round 1' },
  { day: 'Thu, Mar 20', label: 'Leadership Workshops + Finals' },
  { day: 'Fri, Mar 21', label: 'Awards + Closing Ceremony' },
]

const STATE_LEADERSHIP_CONFERENCE = {
  title: 'State Leadership Conference',
  subtitle: 'Starts Mar 18, 2027',
  startDate: '2027-03-18T08:00:00',
}

function getCountdown(targetDate: string) {
  const target = new Date(targetDate)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()

  if (Number.isNaN(target.getTime()) || diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0 }
  }

  const totalMinutes = Math.floor(diffMs / 60000)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  return { days, hours, minutes }
}

export default function HomePage() {
  const { user, isLoaded } = useUser()
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [activeFeedFilter, setActiveFeedFilter] = useState<FeedFilter>('All')
  const { width } = useWindowDimensions()

  const compactDevice = width < 380
  const conferenceLogoSize = Math.max(48, Math.min(82, width * 0.17))
  const conferenceLogoContainerSize = conferenceLogoSize + (compactDevice ? 24 : 30)
  const conferenceLogoTopInset = compactDevice ? 30 : 42
  const conferenceLogoRightInset = compactDevice ? 4 : -5

  const countdown = useMemo(
    () => getCountdown(STATE_LEADERSHIP_CONFERENCE.startDate),
    []
  )

  const name = useMemo(() => {
    if (!isLoaded) return 'Member'

    return (
      user?.firstName ||
      user?.fullName ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
      'Member'
    )
  }, [isLoaded, user])

  const profileImageUrl = user?.imageUrl ?? null
  const showPosts = activeFeedFilter === 'All' || activeFeedFilter === 'Posts'
  const showAnnouncements =
    activeFeedFilter === 'All' || activeFeedFilter === 'Announcements'

  return (
      <SwipeScreen>
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-5 pb-24 pt-4"
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-[#7B8CA8]">Welcome back</Text>
            <Text className="mt-1 text-3xl font-bold text-[#1E2535]">
              Hello, {name}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable className="h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[#DCE3F0] bg-white">
              {profileImageUrl ? (
                <Image
                  source={{ uri: profileImageUrl }}
                  resizeMode="cover"
                  className="h-full w-full"
                />
              ) : (
                <Ionicons name="person" size={18} color="#4A5A77" />
              )}
            </Pressable>

            <Pressable className="h-11 w-11 items-center justify-center rounded-full border border-[#DCE3F0] bg-white">
              <Ionicons name="notifications" size={18} color="#4A5A77" />
              <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#FF4D4F]" />
            </Pressable>
          </View>
        </View>

        <View className="mt-8 h-px bg-[#DFE6F2]" />

        <View className="mt-6 overflow-hidden rounded-3xl border border-[#2EA6FF]/40 bg-[#1F38D8] p-7">
          <View
            className="absolute items-center justify-center"
            style={{
              width: conferenceLogoContainerSize,
              height: conferenceLogoContainerSize,
              top: conferenceLogoTopInset,
              right: conferenceLogoRightInset,
            }}
          >
            <View
              style={{ width: conferenceLogoSize, height: conferenceLogoSize }}
              className="items-center justify-center rounded-full bg-white/10"
            >
              <Text className="text-lg font-bold text-white">FBLA</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <View className="rounded-lg bg-[#4E66F5] px-3 py-1.5">
              <Text className="text-xs font-bold uppercase tracking-wide text-white">
                Upcoming Event
              </Text>
            </View>
            <Text className="text-sm text-white/85">
              {STATE_LEADERSHIP_CONFERENCE.subtitle}
            </Text>
          </View>

          <Text className="mt-4 text-4xl font-extrabold text-white">
            {'State Leadership\nConference'}
          </Text>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 items-center rounded-2xl border border-white/20 bg-white/10 py-3">
              <Text className="text-2xl font-bold text-white">{countdown.days}</Text>
              <Text className="mt-1 text-sm font-bold tracking-wide text-white/80">
                DAYS
              </Text>
            </View>
            <View className="flex-1 items-center rounded-2xl border border-white/20 bg-white/10 py-3">
              <Text className="text-2xl font-bold text-white">{countdown.hours}</Text>
              <Text className="mt-1 text-sm font-bold tracking-wide text-white/80">
                HOURS
              </Text>
            </View>
            <View className="flex-1 items-center rounded-2xl border border-white/20 bg-white/10 py-3">
              <Text className="text-2xl font-bold text-white">{countdown.minutes}</Text>
              <Text className="mt-1 text-sm font-bold tracking-wide text-white/80">
                MINUTES
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row gap-2">
          <Pressable className="flex-1 flex-row items-center justify-center rounded-xl border border-green-200 bg-green-50 px-3.5 py-2">
            <Ionicons name="alarm-outline" size={14} color="green" />
            <Text className="ml-1.5 text-sm font-semibold text-green-700">
              Set Reminder
            </Text>
          </Pressable>

          <Pressable className="flex-1 flex-row items-center justify-center rounded-xl border border-yellow-200 bg-yellow-50 px-3.5 py-2">
            <Ionicons name="star-outline" size={14} color="#CA8A04" />
            <Text className="ml-1.5 text-sm font-semibold text-yellow-600">
              Follow
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setCalendarVisible(true)}
            className="flex-1 flex-row items-center justify-center rounded-xl border border-[#D6E3FA] bg-[#F5F8FF] px-3.5 py-2"
          >
            <Ionicons name="calendar-outline" size={14} color="#365EEB" />
            <Text className="ml-1.5 text-sm font-semibold text-[#365EEB]">
              Calendar
            </Text>
          </Pressable>
        </View>

        <View className="mt-8 flex-row gap-3">
          <Pressable className="flex-1 rounded-2xl border border-[#D8E6FF] bg-[#F4F8FF] px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#DBEAFE]">
              <Ionicons name="library" size={20} color="#1D4ED8" />
            </View>
            <Text className="mt-3 text-base font-bold text-[#1E40AF]">
              View Resources
            </Text>
            <Text className="mt-1 text-xs text-[#5F77A8]">
              Open study guides and documents
            </Text>
          </Pressable>

          <Pressable className="flex-1 rounded-2xl border border-[#E6D8FF] bg-[#F8F4FF] px-4 py-4">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#E9DDFF]">
              <Ionicons name="chatbubbles" size={20} color="#7C3AED" />
            </View>
            <Text className="mt-3 text-base font-bold text-[#6D28D9]">
              Community
            </Text>
            <Text className="mt-1 text-xs text-[#77619E]">
              See social posts and chapter updates
            </Text>
          </Pressable>
        </View>

        <View className="mt-8">
          <Text className="text-2xl font-semibold text-slate-900">News Feed</Text>

          <View className="mt-3 flex-row gap-2">
            {FEED_FILTERS.map((filter) => {
              const active = activeFeedFilter === filter

              return (
                <Pressable
                  key={filter}
                  onPress={() => setActiveFeedFilter(filter)}
                  className={`rounded-full px-4 py-2 ${
                    active ? 'bg-[#1F39D6]' : 'bg-[#EEF2F7]'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? 'text-white' : 'text-[#5F708C]'
                    }`}
                  >
                    {filter}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <View className="mt-3 gap-3">
            {showPosts
              ? POSTS.map((post) => (
                  <View
                    key={post.id}
                    className="rounded-2xl border border-[#E2E9F4] bg-white px-4 py-4"
                  >
                    <View className="self-start rounded-full bg-[#EEF3FF] px-3 py-1">
                      <Text className="text-xs font-bold text-[#365EEB]">POST</Text>
                    </View>
                    <Text className="mt-2 text-xs text-[#8DA0BE]">{post.meta}</Text>
                    <Text className="mt-2 text-xl font-bold leading-7 text-[#1E2535]">
                      {post.title}
                    </Text>
                    <Text className="mt-2 text-base leading-6 text-[#637590]">
                      {post.body}
                    </Text>
                  </View>
                ))
              : null}

            {showAnnouncements
              ? ANNOUNCEMENTS.map((item) => (
                  <View
                    key={item.id}
                    className="rounded-2xl border border-[#E2E9F4] bg-white px-4 py-4"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="rounded-full bg-[#EAF8F0] px-3 py-1">
                        <Text className="text-xs font-bold text-[#1EA867]">
                          {item.tag}
                        </Text>
                      </View>
                      <Ionicons
                        name="megaphone-outline"
                        size={16}
                        color="#7B8CA8"
                      />
                    </View>
                    <Text className="mt-3 text-xl font-bold leading-7 text-[#1E2535]">
                      {item.title}
                    </Text>
                    <Text className="mt-2 text-base leading-6 text-[#637590]">
                      {item.body}
                    </Text>
                  </View>
                ))
              : null}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={calendarVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/35">
          <Pressable className="flex-1" onPress={() => setCalendarVisible(false)} />

          <View className="rounded-t-3xl bg-white px-6 pb-8 pt-5">
            <View className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#D8E1F0]" />

            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-bold text-[#1E2535]">
                  {STATE_LEADERSHIP_CONFERENCE.title}
                </Text>
                <Text className="mt-1 text-sm text-[#6A7892]">
                  Mar 18–21, 2027 • Event Calendar
                </Text>
              </View>

              <Pressable
                onPress={() => setCalendarVisible(false)}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#F3F6FB]"
              >
                <Ionicons name="close" size={18} color="#4A5A77" />
              </Pressable>
            </View>

            <View className="mt-4 gap-2">
              {EVENT_CALENDAR.map((item) => (
                <View
                  key={item.day}
                  className="rounded-xl border border-[#E2E9F4] bg-white px-4 py-3"
                >
                  <Text className="text-sm font-semibold text-[#365EEB]">
                    {item.day}
                  </Text>
                  <Text className="mt-1 text-sm text-[#5E708C]">{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </SwipeScreen>
  )
}