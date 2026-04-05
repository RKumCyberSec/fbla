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

export default function HeroCard() {
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
      
      
        

    

        <View className="mt-6 overflow-hidden rounded-3xl border border-[#2EA6FF]/40 bg-[#1F38D8] p-7 mb-8">
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

       

       

        
      
   
  )
}