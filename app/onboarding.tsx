import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useUser } from '@clerk/expo'
import { supabase } from '@/lib/supabase'

type Chapter = {
  id: string
  name: string
}

export default function OnboardingScreen() {
  const router = useRouter()
  const { user } = useUser()

  const [loading, setLoading] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [schoolName, setSchoolName] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [bio, setBio] = useState('')
  const [role, setRole] = useState<'member' | 'chapter_officer' | 'advisor'>('member')
  const [chapterId, setChapterId] = useState<string | null>(null)

  useEffect(() => {
    const fetchChapters = async () => {
      const { data, error } = await supabase
        .from('chapters')
        .select('id, name')
        .order('name', { ascending: true })

      if (!error && data) {
        setChapters(data)
      }
    }

    fetchChapters()
  }, [])
const handleFinish = async () => {
  if (!user) return

  try {
    setLoading(true)

    const payload = {
      clerk_user_id: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? null,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      school_name: schoolName.trim(),
      graduation_year: graduationYear ? Number(graduationYear) : null,
      bio: bio.trim() || null,
      role,
      chapter_id: chapterId ?? null,
      image_url: user.imageUrl ?? null,
      onboarding_completed: true,
      onboarding_step: 999,
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, {
        onConflict: 'clerk_user_id',
      })
      .select()

    if (error) {
      console.error('SUPABASE UPSERT ERROR:', error)
      Alert.alert('Error', error.message)
      return
    }

    console.log('Saved user:', data)
    router.replace('/')
  } catch (err) {
    console.error('ONBOARDING SAVE ERROR:', err)
    Alert.alert('Error', 'Could not save onboarding info.')
  } finally {
    setLoading(false)
  }
}
  return (
    <ScrollView className="flex-1 bg-white px-6 pt-16">
      <Text className="text-3xl font-bold mb-2">Welcome</Text>
      <Text className="text-base text-gray-500 mb-8">
        Set up your member profile to continue.
      </Text>

      <Text className="mb-2 font-semibold">First Name</Text>
      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="First name"
      />

      <Text className="mb-2 font-semibold">Last Name</Text>
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Last name"
      />

      <Text className="mb-2 font-semibold">School Name</Text>
      <TextInput
        value={schoolName}
        onChangeText={setSchoolName}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Your school"
      />

      <Text className="mb-2 font-semibold">Graduation Year</Text>
      <TextInput
        value={graduationYear}
        onChangeText={setGraduationYear}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="2027"
        keyboardType="number-pad"
      />

      <Text className="mb-2 font-semibold">Short Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        className="border border-gray-300 rounded-xl px-4 py-3 mb-4"
        placeholder="Tell us about yourself"
        multiline
      />

      <Text className="mb-2 font-semibold">Role</Text>
      <View className="flex-row gap-2 mb-4">
        {['member', 'chapter_officer', 'advisor'].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setRole(item as 'member' | 'chapter_officer' | 'advisor')}
            className={`px-4 py-3 rounded-xl border ${
              role === item ? 'border-black bg-black' : 'border-gray-300 bg-white'
            }`}
          >
            <Text className={role === item ? 'text-white' : 'text-black'}>
              {item.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="mb-2 font-semibold">Select Chapter</Text>
      <View className="mb-6">
        {chapters.slice(0, 10).map((chapter) => (
          <TouchableOpacity
            key={chapter.id}
            onPress={() => setChapterId(chapter.id)}
            className={`px-4 py-3 rounded-xl border mb-2 ${
              chapterId === chapter.id ? 'border-black bg-black' : 'border-gray-300 bg-white'
            }`}
          >
            <Text className={chapterId === chapter.id ? 'text-white' : 'text-black'}>
              {chapter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleFinish}
        disabled={loading}
        className="bg-black rounded-xl py-4 mb-10"
      >
        <Text className="text-white text-center font-semibold">
          {loading ? 'Saving...' : 'Finish Onboarding'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  )
}