import { BlurView } from 'expo-blur'
import { View } from 'react-native'

export default function GlassTabBarBackground() {
  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.45)',
      }}
    >
      <BlurView
        intensity={55}
        tint="light"
        style={{
          ...Object.assign({}, { flex: 1 }),
        }}
      />
    </View>
  )
}