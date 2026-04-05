import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, View } from 'react-native'
import SwipeScreen from '@/components/SwipeScreen'

export default function ResourcesScreen() {
  return (
    <SwipeScreen>
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <Text className="text-3xl font-bold text-black">Resources</Text>
        </View>
      </SafeAreaView>
    </SwipeScreen>
  )
}