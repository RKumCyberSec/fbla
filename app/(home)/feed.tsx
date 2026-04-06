import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { getOrCreateDbUser } from "@/lib/social";
import PostCard from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import { useTabBarAnimation } from "./_layout";

type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  author_id: string | null;
  post_likes: { count: number }[];
  post_comments: { count: number }[];
  author: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    clerk_user_id: string;
  } | null;
};

export default function SocialScreen() {
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const { setCollapsed } = useTabBarAnimation();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const lastY = useRef(0);

  const bootstrapUser = useCallback(async () => {
    if (!user) return;

    const dbUser = await getOrCreateDbUser({
      id: user.id,
      primaryEmailAddress: user.primaryEmailAddress
        ? { emailAddress: user.primaryEmailAddress.emailAddress }
        : null,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    });

    if (dbUser) {
      setDbUserId(dbUser.id);
    }
  }, [user]);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        content,
        created_at,
        media_url,
        media_type,
        author_id,
        post_likes(count),
        post_comments(count),
        author:users!posts_author_id_fkey (
          id,
          first_name,
          last_name,
          image_url,
          clerk_user_id
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchPosts error:", error);
      return;
    }

    setPosts((data || []) as FeedPost[]);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await bootstrapUser();
      await fetchPosts();
      setLoading(false);
    };

    init();
  }, [bootstrapUser, fetchPosts]);

  useEffect(() => {
    return () => {
      setCollapsed(false);
    };
  }, [setCollapsed]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;

    if (y <= 0) {
      setCollapsed(false);
      lastY.current = y;
      return;
    }

    if (y > lastY.current + 4) {
      setCollapsed(true);
    } else if (y < lastY.current - 4) {
      setCollapsed(false);
    }

    lastY.current = y;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View
        className="px-4 pb-3 border-b border-gray-200 flex-row items-center justify-between bg-white"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View>
          <Text className="text-xs font-medium text-gray-500">Your network</Text>
          <Text className="mt-1 text-3xl font-semibold text-black">Social</Text>
        </View>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="w-11 h-11 rounded-full bg-black items-center justify-center"
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} refresh={fetchPosts} currentDbUserId={dbUserId} />
        )}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="py-24 items-center">
            <Ionicons name="images-outline" size={34} color="#9CA3AF" />
            <Text className="mt-3 text-base font-medium text-gray-500">
              No posts yet
            </Text>
            <Text className="mt-1 text-sm text-gray-400">
              Be the first to share something
            </Text>
          </View>
        }
      />

      <CreatePostModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        refresh={fetchPosts}
        currentDbUserId={dbUserId}
      />
    </View>
  );
}