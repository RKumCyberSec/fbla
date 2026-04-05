import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'
import { useUser, useClerk } from '@clerk/expo'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { decode } from 'base64-arraybuffer'
import { useTabBarAnimation } from './_layout'
import SwipeScreen from '@/components/SwipeScreen'
import { supabase } from '@/lib/supabase'
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native'
type UserRow = {
  id: string
  clerk_user_id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export default function ProfileScreen() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()

  const [dbUser, setDbUser] = useState<UserRow | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [imageUrlInput, setImageUrlInput] = useState('')

const { setCollapsed } = useTabBarAnimation()
  const lastY = useRef(0)

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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    const load = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('clerk_user_id', user.id)
        .maybeSingle()

      setDbUser(data)
      setLoadingProfile(false)
    }

    load()
  }, [isLoaded, isSignedIn])




  












  useEffect(() => {
    if (!isLoaded) return

    if (!isSignedIn || !user?.id) {
      setDbUser(null)
      setLoadingProfile(false)
      return
    }

    const loadProfile = async () => {
      try {
        setLoadingProfile(true)
        setError(null)

        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_user_id', user.id)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (existingUser) {
          setDbUser(existingUser)
          return
        }

        const payload = {
          clerk_user_id: user.id,
          email:
            user.primaryEmailAddress?.emailAddress ??
            user.emailAddresses?.[0]?.emailAddress ??
            null,
          first_name: user.firstName ?? null,
          last_name: user.lastName ?? null,
          image_url: user.imageUrl ?? null,
        }

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert(payload)
          .select()
          .single()

        if (insertError) throw insertError

        setDbUser(insertedUser)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load profile.')
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [isLoaded, isSignedIn, user?.id])

  const fullName = useMemo(() => {
    const first = dbUser?.first_name ?? user?.firstName ?? ''
    const last = dbUser?.last_name ?? user?.lastName ?? ''
    return `${first} ${last}`.trim() || 'FBLA Member'
  }, [dbUser?.first_name, dbUser?.last_name, user?.firstName, user?.lastName])

  const profileEmail =
    dbUser?.email ??
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    'No email available'

  const imageUrl = dbUser?.image_url ?? user?.imageUrl ?? 'https://i.pravatar.cc/300'

  const stats = [
    { label: 'Events', value: '12' },
    { label: 'Competitions', value: '4' },
    { label: 'Badges', value: '8' },
  ]

  const quickActions = [
    {
      title: 'My Events',
      subtitle: 'View registered events',
      icon: <Ionicons name="calendar-outline" size={22} color="#1D4ED8" />,
    },
    {
      title: 'Resources',
      subtitle: 'Documents and guides',
      icon: <Feather name="folder" size={22} color="#1D4ED8" />,
    },
    {
      title: 'Announcements',
      subtitle: 'Latest FBLA updates',
      icon: <Ionicons name="notifications-outline" size={22} color="#1D4ED8" />,
    },
    {
      title: 'Social Channels',
      subtitle: 'Stay connected online',
      icon: <Feather name="instagram" size={22} color="#1D4ED8" />,
    },
  ]

  const openEditProfile = () => {
    setFirstName(dbUser?.first_name ?? user?.firstName ?? '')
    setLastName(dbUser?.last_name ?? user?.lastName ?? '')
    setEmail(
      dbUser?.email ??
        user?.primaryEmailAddress?.emailAddress ??
        user?.emailAddresses?.[0]?.emailAddress ??
        ''
    )
    setImageUrlInput(dbUser?.image_url ?? user?.imageUrl ?? '')
    setEditOpen(true)
  }

  const pickAndUploadProfileImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (result.canceled || !result.assets?.length) return

      const asset = result.assets[0]
      const uri = asset.uri

      if (!uri || !user?.id) {
        Alert.alert('Error', 'Could not read the selected image.')
        return
      }

      setUploadingImage(true)

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const fileExt =
        asset.mimeType?.split('/')[1] ||
        uri.split('.').pop()?.toLowerCase() ||
        'jpg'

      const contentType = asset.mimeType || `image/${fileExt}`
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64), {
          contentType,
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)

      if (!data?.publicUrl) {
        throw new Error('Failed to get public image URL.')
      }

      setImageUrlInput(data.publicUrl)
      Alert.alert('Success', 'Profile photo uploaded.')
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message ?? 'Could not upload image.')
    } finally {
      setUploadingImage(false)
    }
  }

  const saveProfile = async () => {
    if (!user?.id) return

    try {
      setSavingProfile(true)
      setError(null)

      const cleanFirstName = firstName.trim() || null
      const cleanLastName = lastName.trim() || null
      const cleanEmail = email.trim() || null
      const cleanImageUrl = imageUrlInput.trim() || null

      const updatePayload = {
        email: cleanEmail,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        image_url: cleanImageUrl,
        updated_at: new Date().toISOString(),
      }

      const { data: updatedRow, error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('clerk_user_id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      await user.update({
        firstName: cleanFirstName ?? '',
        lastName: cleanLastName ?? '',
      })

      setDbUser(updatedRow)
      setEditOpen(false)
      Alert.alert('Success', 'Your profile has been updated.')
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to save profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  if (!isLoaded || loadingProfile) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base text-slate-600">Loading profile...</Text>
          </View>
        </SafeAreaView>
      </SwipeScreen>
    )
  }

  if (!isSignedIn) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-2xl font-bold text-slate-900">Not signed in</Text>
          </View>
        </SafeAreaView>
      </SwipeScreen>
    )
  }

  return (
    <SwipeScreen>
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="flex-1">
          <ScrollView
           showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 120 }}
          >
            <View className="px-5 pt-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-sm font-medium text-slate-500">FBLA Member Profile</Text>
                  <Text className="mt-1 text-3xl font-bold text-slate-900">Profile</Text>
                </View>

                <View className="h-11 w-11 items-center justify-center rounded-full bg-white">
                  <Ionicons name="person-outline" size={22} color="#0F172A" />
                </View>
              </View>

              {error ? (
                <View className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
                  <Text className="font-semibold text-red-700">Profile load error</Text>
                  <Text className="mt-1 text-sm text-red-600">{error}</Text>
                </View>
              ) : null}

              <View >
                <View className="mt-6 overflow-hidden rounded-[32px] bg-slate-900">
  <Image
    source={{ uri: imageUrl }}
    className="absolute inset-0 h-full w-full opacity-35"
    blurRadius={35}
  />

  <View className="absolute inset-0 bg-black/35" />

  <View className="px-5 pb-6 pt-7">
    <View className="flex-row items-start justify-between">
      <View className="flex-row items-center">
        <Image
          source={{ uri: imageUrl }}
          className="h-24 w-24 rounded-full border-2 border-white"
        />

        <View className="ml-4 flex-1">
          <Text className="text-3xl font-bold text-white">{fullName}</Text>
          <Text className="mt-1 text-sm text-slate-200">{profileEmail}</Text>

          <View className="mt-3 self-start rounded-full bg-white/20 px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-white">
              Active Member
            </Text>
          </View>
        </View>
      </View>
    </View>

    <Text className="mt-5 text-sm leading-6 text-slate-100">
      FBLA member staying connected with events, competitions, announcements,
      and chapter activity across the community.
    </Text>

    <View className="mt-6 flex-row justify-between rounded-[24px] bg-white/12 px-4 py-4">
      <View className="items-center">
        <Text className="text-2xl font-bold text-white">128</Text>
        <Text className="mt-1 text-xs font-medium text-slate-200">Following</Text>
      </View>

      <View className="items-center">
        <Text className="text-2xl font-bold text-white">2.4K</Text>
        <Text className="mt-1 text-xs font-medium text-slate-200">Followers</Text>
      </View>

      <View className="items-center">
        <Text className="text-2xl font-bold text-white">36</Text>
        <Text className="mt-1 text-xs font-medium text-slate-200">Posts</Text>
      </View>
    </View>

    
  </View>
</View>

              
              </View>

              <View className="mt-6 rounded-[24px] bg-white p-5">
                <Text className="text-lg font-bold text-slate-900">About</Text>
                <Text className="mt-3 text-sm leading-6 text-slate-600">
                  This profile is connected to Clerk authentication and your Supabase users table.
                </Text>
              </View>

              

              <View className="mt-2 rounded-[24px] bg-white p-3">
                <Text className="px-2 pb-2 pt-2 text-lg font-bold text-slate-900">Account</Text>

                <Pressable
                  onPress={openEditProfile}
                  className="flex-row items-center justify-between rounded-2xl border-b border-slate-100 px-3 py-4"
                >
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Feather name="edit-2" size={20} color="#111827" />
                    </View>
                    <Text className="ml-3 text-base font-medium text-slate-800">Edit Profile</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </Pressable>

                <Pressable className="flex-row items-center justify-between rounded-2xl border-b border-slate-100 px-3 py-4">
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Ionicons name="people-outline" size={20} color="#111827" />
                    </View>
                    <Text className="ml-3 text-base font-medium text-slate-800">
                      Chapter Information
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </Pressable>

                <Pressable className="flex-row items-center justify-between rounded-2xl border-b border-slate-100 px-3 py-4">
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Ionicons name="alarm-outline" size={20} color="#111827" />
                    </View>
                    <Text className="ml-3 text-base font-medium text-slate-800">
                      Competition Reminders
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </Pressable>

                <Pressable className="flex-row items-center justify-between rounded-2xl border-b border-slate-100 px-3 py-4">
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <MaterialIcons name="description" size={20} color="#111827" />
                    </View>
                    <Text className="ml-3 text-base font-medium text-slate-800">
                      Saved Documents
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </Pressable>

                <Pressable className="flex-row items-center justify-between rounded-2xl px-3 py-4">
                  <View className="flex-row items-center">
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                      <Ionicons name="settings-outline" size={20} color="#111827" />
                    </View>
                    <Text className="ml-3 text-base font-medium text-slate-800">Settings</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#64748B" />
                </Pressable>
              </View>

              <View className="absolute bottom-6 left-0 right-0 px-5">
            <Pressable
              onPress={async () => {
                if (loggingOut) return
                setLoggingOut(true)
                await signOut()
              }}
              className="h-14 items-center justify-center rounded-2xl bg-red-600"
            >
              <Text className="text-base font-semibold text-white">
                {loggingOut ? 'Logging out...' : 'Log Out'}
              </Text>
            </Pressable>
          </View>
            </View>
          </ScrollView>

          
        </View>

        <Modal visible={editOpen} animationType="slide" transparent>
          <View className="flex-1 justify-end bg-black/40">
            <View className="rounded-t-3xl bg-white px-5 pb-8 pt-5">
              <View className="mb-4 flex-row items-center justify-between">
                <Text className="text-2xl font-bold text-slate-900">Edit Profile</Text>
                <Pressable onPress={() => setEditOpen(false)}>
                  <Ionicons name="close" size={26} color="#0F172A" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="mb-5 items-center">
                  <Image
                    source={{ uri: imageUrlInput || imageUrl }}
                    className="h-28 w-28 rounded-full"
                  />

                  <Pressable
                    onPress={pickAndUploadProfileImage}
                    disabled={uploadingImage}
                    className="mt-4 rounded-2xl bg-blue-700 px-5 py-3"
                  >
                    <Text className="font-semibold text-white">
                      {uploadingImage ? 'Uploading...' : 'Choose Profile Picture'}
                    </Text>
                  </Pressable>
                </View>

                <Text className="mb-2 text-sm font-medium text-slate-700">First Name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  className="mb-4 rounded-2xl border border-slate-200 px-4 py-4 text-slate-900"
                />

                <Text className="mb-2 text-sm font-medium text-slate-700">Last Name</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  className="mb-4 rounded-2xl border border-slate-200 px-4 py-4 text-slate-900"
                />

                <Text className="mb-2 text-sm font-medium text-slate-700">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  className="mb-4 rounded-2xl border border-slate-200 px-4 py-4 text-slate-900"
                />

                <Pressable
                  onPress={saveProfile}
                  disabled={savingProfile}
                  className="h-14 items-center justify-center rounded-2xl bg-blue-700"
                >
                  <Text className="text-base font-semibold text-white">
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SwipeScreen>
  )
}