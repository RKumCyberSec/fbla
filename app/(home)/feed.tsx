import SwipeScreen from '@/components/SwipeScreen'
import { supabase } from '@/lib/supabase'
import { useUser } from '@clerk/expo'
import * as ImagePicker from 'expo-image-picker'
import { VideoView, useVideoPlayer } from 'expo-video'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import * as MediaLibrary from 'expo-media-library'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type FeedPost = {
  id: string
  author_id: string | null
  title: string | null
  content: string
  post_type: string
  visibility: string
  image_url: string | null
  media_type: 'image' | 'video'
  media_url: string | null
  thumbnail_url: string | null
  share_count: number
  video_duration_seconds: number | null
  is_pinned: boolean
  published_at: string
  created_at: string
  updated_at: string
  first_name: string | null
  last_name: string | null
  author_image_url: string | null
  like_count: number
  comment_count: number
}

type Comment = {
  id: string
  content: string
  created_at: string
  user_id: string
  users:
    | {
        first_name: string | null
        last_name: string | null
        image_url: string | null
      }
    | null
}

type RawComment = {
  id: string
  content: string
  created_at: string
  user_id: string
  users:
    | {
        first_name: string | null
        last_name: string | null
        image_url: string | null
      }[]
    | null
}

type PickedMedia = {
  uri: string
  type: 'image' | 'video'
  mimeType: string
  fileName: string
  fileSize: number
  assetId?: string | null
}

function formatTimeAgo(dateString: string) {
  const now = new Date().getTime()
  const date = new Date(dateString).getTime()
  const diff = Math.floor((now - date) / 1000)

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`
  return `${Math.floor(diff / 604800)}w`
}

function getDisplayName(firstName?: string | null, lastName?: string | null) {
  const full = `${firstName ?? ''} ${lastName ?? ''}`.trim()
  return full || 'User'
}

function getFileExtensionFromMime(
  mimeType: string,
  mediaType: 'image' | 'video'
) {
  if (mimeType.includes('jpeg')) return 'jpg'
  if (mimeType.includes('jpg')) return 'jpg'
  if (mimeType.includes('png')) return 'png'
  if (mimeType.includes('webp')) return 'webp'
  if (mimeType.includes('mov')) return 'mov'
  if (mimeType.includes('mp4')) return 'mp4'
  if (mimeType.includes('quicktime')) return 'mov'
  return mediaType === 'video' ? 'mp4' : 'jpg'
}

function getFileNameFromUri(uri: string) {
  const parts = uri.split('/')
  return parts[parts.length - 1] || `upload-${Date.now()}`
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
}

function PostVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = true
  })

  return (
    <VideoView
      player={player}
      nativeControls
      allowsFullscreen
      className="h-[420px] w-full rounded-2xl bg-black"
    />
  )
}

function FeedCard({
  post,
  liked,
  onLike,
  onOpenComments,
  onShare,
}: {
  post: FeedPost
  liked: boolean
  onLike: (postId: string, liked: boolean) => void
  onOpenComments: (post: FeedPost) => void
  onShare: (post: FeedPost) => void
}) {
  const authorName = getDisplayName(post.first_name, post.last_name)

  return (
    <View className="mb-5 rounded-3xl border border-neutral-200 bg-white p-4">
      <View className="mb-3 flex-row items-center">
        <Image
          source={{
            uri:
              post.author_image_url ||
              'https://ui-avatars.com/api/?name=User&background=random',
          }}
          className="h-12 w-12 rounded-full"
        />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-black">{authorName}</Text>
          <Text className="text-xs text-neutral-500">
            {formatTimeAgo(post.published_at)}
          </Text>
        </View>

        {post.is_pinned ? (
          <View className="rounded-full bg-black px-3 py-1">
            <Text className="text-xs font-semibold text-white">Pinned</Text>
          </View>
        ) : null}
      </View>

      {post.title ? (
        <Text className="mb-1 text-lg font-bold text-black">{post.title}</Text>
      ) : null}

      <Text className="mb-3 text-[15px] leading-6 text-neutral-800">
        {post.content}
      </Text>

      {post.media_type === 'video' && post.media_url ? (
        <PostVideo uri={post.media_url} />
      ) : post.media_url || post.image_url ? (
        <Image
          source={{ uri: post.media_url || post.image_url || '' }}
          className="h-[420px] w-full rounded-2xl bg-neutral-100"
          resizeMode="cover"
        />
      ) : null}

      <View className="mt-4 flex-row items-center justify-between">
        <Pressable
          onPress={() => onLike(post.id, liked)}
          className={`flex-1 rounded-2xl py-3 ${liked ? 'bg-red-50' : 'bg-neutral-100'}`}
        >
          <Text
            className={`text-center font-semibold ${liked ? 'text-red-600' : 'text-black'}`}
          >
            {liked ? '♥' : '♡'} {post.like_count}
          </Text>
        </Pressable>

        <View className="w-3" />

        <Pressable
          onPress={() => onOpenComments(post)}
          className="flex-1 rounded-2xl bg-neutral-100 py-3"
        >
          <Text className="text-center font-semibold text-black">
            💬 {post.comment_count}
          </Text>
        </Pressable>

        <View className="w-3" />

        <Pressable
          onPress={() => onShare(post)}
          className="flex-1 rounded-2xl bg-neutral-100 py-3"
        >
          <Text className="text-center font-semibold text-black">
            ↗ {post.share_count}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

export default function FeedScreen() {
  const { user } = useUser()

  const [appUserId, setAppUserId] = useState<string | null>(null)
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [likedPostIds, setLikedPostIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [selectedPost, setSelectedPost] = useState<FeedPost | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentInput, setCommentInput] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCaption, setNewCaption] = useState('')
  const [pickedMedia, setPickedMedia] = useState<PickedMedia | null>(null)
  const [uploadingPost, setUploadingPost] = useState(false)

  const commentsModalVisible = useMemo(() => !!selectedPost, [selectedPost])

  const getAppUser = useCallback(async () => {
    if (!user?.id) return null

    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('getAppUser error', error)
      return null
    }

    return data?.id ?? null
  }, [user?.id])

  const loadFeed = useCallback(async () => {
    try {
      if (!user?.id) return

      const dbUserId = await getAppUser()
      setAppUserId(dbUserId)

      const { data: feedData, error: feedError } = await supabase
        .from('feed_posts_view')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('published_at', { ascending: false })

      if (feedError) {
        console.error('loadFeed error', feedError)
        Alert.alert('Error', 'Could not load feed.')
        return
      }

      const typedPosts = (feedData ?? []) as FeedPost[]
      setPosts(typedPosts)

      if (dbUserId && typedPosts.length > 0) {
        const postIds = typedPosts.map((p) => p.id)

        const { data: likesData, error: likesError } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', dbUserId)
          .in('post_id', postIds)

        if (likesError) {
          console.error('loadFeed likes error', likesError)
        } else {
          const likedMap: Record<string, boolean> = {}
          ;(likesData ?? []).forEach((like) => {
            likedMap[like.post_id] = true
          })
          setLikedPostIds(likedMap)
        }
      } else {
        setLikedPostIds({})
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [getAppUser, user?.id])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  const handleRefresh = () => {
    setRefreshing(true)
    Keyboard.dismiss()
    loadFeed()
  }

  const handleLike = async (postId: string, alreadyLiked: boolean) => {
    if (!appUserId) {
      Alert.alert('Error', 'User record not found.')
      return
    }

    const previousPosts = [...posts]
    const previousLiked = { ...likedPostIds }

    setLikedPostIds((prev) => ({
      ...prev,
      [postId]: !alreadyLiked,
    }))

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              like_count: alreadyLiked
                ? Math.max(0, post.like_count - 1)
                : post.like_count + 1,
            }
          : post
      )
    )

    if (alreadyLiked) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', appUserId)

      if (error) {
        console.error('unlike error', error)
        setPosts(previousPosts)
        setLikedPostIds(previousLiked)
        Alert.alert('Error', 'Could not remove like.')
      }
      return
    }

    const { error } = await supabase.from('post_likes').insert({
      post_id: postId,
      user_id: appUserId,
    })

    if (error) {
      console.error('like error', error)
      setPosts(previousPosts)
      setLikedPostIds(previousLiked)
      Alert.alert('Error', 'Could not like post.')
    }
  }

  const loadComments = async (postId: string) => {
    setCommentsLoading(true)

    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        users (
          first_name,
          last_name,
          image_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    setCommentsLoading(false)

    if (error) {
      console.error('loadComments error', error)
      Alert.alert('Error', 'Could not load comments.')
      return
    }

    const rawComments = (data ?? []) as RawComment[]

    const normalizedComments: Comment[] = rawComments.map((item) => ({
      id: item.id,
      content: item.content,
      created_at: item.created_at,
      user_id: item.user_id,
      users: Array.isArray(item.users) ? item.users[0] ?? null : null,
    }))

    setComments(normalizedComments)
  }

  const openComments = async (post: FeedPost) => {
    Keyboard.dismiss()
    setSelectedPost(post)
    setCommentInput('')
    await loadComments(post.id)
  }

  const handleAddComment = async () => {
    if (!selectedPost || !appUserId) return
    if (!commentInput.trim()) return

    setSendingComment(true)

    const { error } = await supabase.from('post_comments').insert({
      post_id: selectedPost.id,
      user_id: appUserId,
      content: commentInput.trim(),
    })

    setSendingComment(false)

    if (error) {
      console.error('addComment error', error)
      Alert.alert('Error', 'Could not add comment.')
      return
    }

    setCommentInput('')
    Keyboard.dismiss()

    setPosts((prev) =>
      prev.map((post) =>
        post.id === selectedPost.id
          ? { ...post, comment_count: post.comment_count + 1 }
          : post
      )
    )

    await loadComments(selectedPost.id)
  }

  const handleSharePost = async (post: FeedPost) => {
    try {
      Keyboard.dismiss()

      await Share.share({
        message: `${post.title ? `${post.title}\n` : ''}${post.content}`,
      })

      if (!appUserId) return

      const { error: shareInsertError } = await supabase
        .from('post_shares')
        .insert({
          post_id: post.id,
          user_id: appUserId,
          platform: 'native_share',
        })

      if (shareInsertError) {
        console.error('post_shares insert error', shareInsertError)
      }

      const currentShareCount = post.share_count ?? 0

      const { error: updateError } = await supabase
        .from('posts')
        .update({ share_count: currentShareCount + 1 })
        .eq('id', post.id)

      if (updateError) {
        console.error('share_count update error', updateError)
      }

      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? { ...item, share_count: item.share_count + 1 }
            : item
        )
      )
    } catch (error) {
      console.error('native share error', error)
    }
  }
const pickMediaFromGallery = async () => {
  Keyboard.dismiss()

  const pickerPermission =
    await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!pickerPermission.granted) {
    Alert.alert('Permission needed', 'Please allow gallery access.')
    return
  }

  const mediaPermission = await MediaLibrary.requestPermissionsAsync()

  if (!mediaPermission.granted) {
    Alert.alert('Permission needed', 'Please allow media library access.')
    return
  }

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.7,
      allowsMultipleSelection: false,
      videoMaxDuration: 30,
    })

    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    const inferredType = asset.type === 'video' ? 'video' : 'image'
    const mimeType =
      asset.mimeType ||
      (inferredType === 'video' ? 'video/mp4' : 'image/jpeg')

    let resolvedUri = asset.uri
    let fileSize = asset.fileSize ?? 0

    if (inferredType === 'video' && asset.assetId) {
      const info = await MediaLibrary.getAssetInfoAsync(asset.assetId)

      if (info?.localUri) {
        resolvedUri = info.localUri
      } else {
        Alert.alert(
          'Video not downloaded',
          'This video is in iCloud. Open it in the Photos app first so it downloads to your device, then try again.'
        )
        return
      }

      fileSize = asset.fileSize ?? fileSize
    }

    if (inferredType === 'video' && fileSize > 25 * 1024 * 1024) {
      Alert.alert(
        'Video too large',
        'Please choose a video under 25MB or trim it shorter.'
      )
      return
    }

    setPickedMedia({
      uri: resolvedUri,
      type: inferredType,
      mimeType,
      fileName: asset.fileName || getFileNameFromUri(resolvedUri),
      fileSize,
      assetId: asset.assetId,
    })
  } catch (error) {
    console.error('pickMediaFromGallery error', error)
    Alert.alert(
      'Error',
      'Could not access that video. If it is stored in iCloud, download it in the Photos app first and then try again.'
    )
  }
}

  const resetCreatePostForm = () => {
    Keyboard.dismiss()
    setNewTitle('')
    setNewCaption('')
    setPickedMedia(null)
    setCreateModalVisible(false)
  }

  const handleCreatePost = async () => {
    if (!appUserId) {
      Alert.alert('Error', 'User record not found.')
      return
    }

    if (!newCaption.trim()) {
      Alert.alert('Missing caption', 'Please add a caption.')
      return
    }

    if (!pickedMedia) {
      Alert.alert('Missing media', 'Please select an image or video.')
      return
    }
    if (pickedMedia.type === 'video' && !pickedMedia.uri.startsWith('file://')) {
  Alert.alert(
    'Video not ready',
    'Please choose a video stored locally on your device.'
  )
  return
}

    try {
      setUploadingPost(true)
      Keyboard.dismiss()

      const extension = getFileExtensionFromMime(
        pickedMedia.mimeType,
        pickedMedia.type
      )

      const safeFileName = sanitizeFileName(pickedMedia.fileName)
      const finalFileName =
        safeFileName || `upload-${Date.now()}.${extension}`
      const filePath = `${appUserId}/${Date.now()}-${finalFileName}`

      const uploadUri =
  Platform.OS === 'ios' ? pickedMedia.uri.replace('file://', '') : pickedMedia.uri

const response = await fetch(
  Platform.OS === 'ios' ? `file://${uploadUri}` : uploadUri
)
      if (!response.ok) {
        Alert.alert('Error', 'Could not read selected media.')
        setUploadingPost(false)
        return
      }

      const blob = await response.blob()

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filePath, blob, {
          contentType: pickedMedia.mimeType,
          upsert: false,
        })

      if (uploadError) {
        console.error('uploadError', uploadError)
        Alert.alert('Error', 'Could not upload media.')
        setUploadingPost(false)
        return
      }

      if (!uploadData?.path) {
        Alert.alert('Error', 'Upload completed but no file path was returned.')
        setUploadingPost(false)
        return
      }

      const { data: publicUrlData } = supabase.storage
        .from('post-media')
        .getPublicUrl(uploadData.path)

      const mediaUrl = publicUrlData?.publicUrl

      if (!mediaUrl) {
        Alert.alert('Error', 'Could not generate media URL.')
        setUploadingPost(false)
        return
      }

      const insertPayload = {
        author_id: appUserId,
        title: newTitle.trim() || null,
        content: newCaption.trim(),
        post_type: 'social',
        visibility: 'public',
        media_type: pickedMedia.type,
        media_url: mediaUrl,
        thumbnail_url: pickedMedia.type === 'image' ? mediaUrl : null,
      }

      const { error: postError } = await supabase
        .from('posts')
        .insert(insertPayload)

      if (postError) {
        console.error('postError', postError)
        Alert.alert('Error', 'Could not create post.')
        setUploadingPost(false)
        return
      }

      setUploadingPost(false)
      resetCreatePostForm()
      await loadFeed()
    } catch (error) {
      console.error('handleCreatePost error', error)
      setUploadingPost(false)
      Alert.alert(
        'Error',
        'Video upload failed. Try a shorter MP4 video under 25MB.'
      )
    }
  }

  if (loading) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaView>
      </SwipeScreen>
    )
  }

  return (
    <SwipeScreen>
      <SafeAreaView className="flex-1 bg-white">
        <View className="px-5 pb-3 pt-2">
          <Text className="text-3xl font-bold text-black">Feed</Text>
          <Text className="mt-1 text-sm text-neutral-500">
            Posts, photos, and videos from the community
          </Text>
        </View>

        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <FeedCard
              post={item}
              liked={!!likedPostIds[item.id]}
              onLike={handleLike}
              onOpenComments={openComments}
              onShare={handleSharePost}
            />
          )}
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="text-base text-neutral-500">No posts yet.</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        />

        <Pressable
          onPress={() => {
            Keyboard.dismiss()
            setCreateModalVisible(true)
          }}
          style={{
            position: 'absolute',
            right: 20,
            bottom: 90,
            width: 64,
            height: 64,
            borderRadius: 999,
            backgroundColor: 'black',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            elevation: 10,
          }}
        >
          <Text style={{ color: 'white', fontSize: 32, fontWeight: '700' }}>
            +
          </Text>
        </Pressable>

        <Modal
          visible={createModalVisible}
          animationType="slide"
          transparent
          onRequestClose={resetCreatePostForm}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <View className="flex-1 justify-end bg-black/40">
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View className="rounded-t-[28px] bg-white px-5 pb-8 pt-5">
                    <View className="mb-4 flex-row items-center justify-between">
                      <Text className="text-xl font-bold text-black">
                        Create post
                      </Text>
                      <Pressable onPress={resetCreatePostForm}>
                        <Text className="text-base font-semibold text-neutral-500">
                          Close
                        </Text>
                      </Pressable>
                    </View>

                    <TextInput
                      value={newTitle}
                      onChangeText={setNewTitle}
                      placeholder="Title (optional)"
                      placeholderTextColor="#737373"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit
                      className="mb-3 rounded-2xl border border-neutral-300 px-4 py-3 text-black"
                    />

                    <TextInput
                      value={newCaption}
                      onChangeText={setNewCaption}
                      placeholder="Write a caption..."
                      placeholderTextColor="#737373"
                      multiline
                      returnKeyType="done"
                      blurOnSubmit
                      onSubmitEditing={Keyboard.dismiss}
                      className="mb-4 min-h-[110px] rounded-2xl border border-neutral-300 px-4 py-3 text-black"
                      textAlignVertical="top"
                    />

                    <Pressable
                      onPress={pickMediaFromGallery}
                      className="mb-4 rounded-2xl bg-neutral-100 py-4"
                    >
                      <Text className="text-center font-semibold text-black">
                        {pickedMedia
                          ? 'Change photo/video'
                          : 'Pick photo or video'}
                      </Text>
                    </Pressable>

                    {pickedMedia ? (
                      <View className="mb-4">
                        {pickedMedia.type === 'image' ? (
                          <Image
                            source={{ uri: pickedMedia.uri }}
                            className="h-[260px] w-full rounded-2xl bg-neutral-100"
                            resizeMode="cover"
                          />
                        ) : (
                          <PostVideo uri={pickedMedia.uri} />
                        )}

                        <Text className="mt-2 text-sm text-neutral-500">
                          Selected: {pickedMedia.type}
                        </Text>
                      </View>
                    ) : null}

                    <Pressable
                      onPress={handleCreatePost}
                      disabled={uploadingPost}
                      className="rounded-2xl bg-black py-4"
                    >
                      <Text className="text-center font-semibold text-white">
                        {uploadingPost ? 'Uploading...' : 'Publish'}
                      </Text>
                    </Pressable>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Modal>

        <Modal
          visible={commentsModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedPost(null)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View className="flex-1 justify-end bg-black/40">
              <TouchableWithoutFeedback onPress={() => {}}>
                <View className="h-[78%] rounded-t-[28px] bg-white px-5 pt-5">
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-xl font-bold text-black">
                      Comments
                    </Text>
                    <Pressable
                      onPress={() => {
                        Keyboard.dismiss()
                        setSelectedPost(null)
                      }}
                    >
                      <Text className="text-base font-semibold text-neutral-500">
                        Close
                      </Text>
                    </Pressable>
                  </View>

                  {commentsLoading ? (
                    <View className="flex-1 items-center justify-center">
                      <ActivityIndicator />
                    </View>
                  ) : (
                    <FlatList
                      data={comments}
                      keyExtractor={(item) => item.id}
                      showsVerticalScrollIndicator={false}
                      keyboardDismissMode="on-drag"
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => {
                        const name = getDisplayName(
                          item.users?.first_name,
                          item.users?.last_name
                        )

                        return (
                          <View className="mb-3 rounded-2xl bg-neutral-100 p-3">
                            <View className="mb-1 flex-row items-center">
                              <Image
                                source={{
                                  uri:
                                    item.users?.image_url ||
                                    'https://ui-avatars.com/api/?name=User&background=random',
                                }}
                                className="h-9 w-9 rounded-full"
                              />
                              <View className="ml-3">
                                <Text className="font-semibold text-black">
                                  {name}
                                </Text>
                                <Text className="text-xs text-neutral-500">
                                  {formatTimeAgo(item.created_at)}
                                </Text>
                              </View>
                            </View>

                            <Text className="ml-12 text-[15px] leading-6 text-neutral-800">
                              {item.content}
                            </Text>
                          </View>
                        )
                      }}
                      ListEmptyComponent={
                        <View className="mt-10 items-center">
                          <Text className="text-neutral-500">
                            No comments yet.
                          </Text>
                        </View>
                      }
                    />
                  )}

                  <View className="mb-6 mt-3 flex-row items-center">
                    <TextInput
                      value={commentInput}
                      onChangeText={setCommentInput}
                      placeholder="Write a comment..."
                      placeholderTextColor="#737373"
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      blurOnSubmit
                      className="flex-1 rounded-2xl border border-neutral-300 px-4 py-3 text-black"
                    />
                    <Pressable
                      onPress={handleAddComment}
                      disabled={sendingComment}
                      className="ml-3 rounded-2xl bg-black px-5 py-3"
                    >
                      <Text className="font-semibold text-white">
                        {sendingComment ? '...' : 'Send'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </SwipeScreen>
  )
}