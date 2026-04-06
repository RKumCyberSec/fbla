import { View, TextInput, Pressable, Text } from 'react-native'
import React, { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'

export default function CreatePost() {
  const [caption, setCaption] = useState('')
  const [images, setImages] = useState<string[]>([])

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 1,
    })

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri)
      setImages(uris)
    }
  }

  const uploadPost = async () => {
    // upload images to supabase storage first (simplified)
    const uploadedUrls: string[] = []

    for (let uri of images) {
      const fileName = Date.now() + '.jpg'

      const res = await fetch(uri)
      const blob = await res.blob()

      const { data, error } = await supabase.storage
        .from('posts')
        .upload(fileName, blob)

      if (!error) {
        const publicUrl = supabase.storage
          .from('posts')
          .getPublicUrl(fileName).data.publicUrl

        uploadedUrls.push(publicUrl)
      }
    }

    await supabase.from('posts').insert({
      content: caption,
      media_url: JSON.stringify(uploadedUrls),
      author_id: 'CURRENT_USER_ID',
    })
  }

  return (
    <View className="flex-1 bg-black p-4">
      <TextInput
        placeholder="Write a caption..."
        placeholderTextColor="gray"
        className="text-white mb-4"
        value={caption}
        onChangeText={setCaption}
      />

      <Pressable
        className="bg-white p-3 rounded mb-4"
        onPress={pickImages}
      >
        <Text>Select Images</Text>
      </Pressable>

      <Pressable
        className="bg-blue-500 p-3 rounded"
        onPress={uploadPost}
      >
        <Text className="text-white text-center">Post</Text>
      </Pressable>
    </View>
  )
}