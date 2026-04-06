import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { formatDisplayName } from "@/lib/social";

type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  bio: string | null;
};

type FollowStatus = "none" | "pending" | "accepted";

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const userId = Array.isArray(params.userId) ? params.userId[0] : params.userId;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentDbUserId, setCurrentDbUserId] = useState<string | null>(null);
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCurrentDbUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const clerkUserId = session?.user?.id;
    if (!clerkUserId) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (error) {
      console.error("fetchCurrentDbUser error:", error);
      return null;
    }

    return data?.id || null;
  };

  const fetchProfileData = useCallback(async () => {
    if (!userId) return;

    const dbUserId = await fetchCurrentDbUser();
    setCurrentDbUserId(dbUserId);

    const [{ data: userData, error: userError }, { data: postsData, error: postsError }] =
      await Promise.all([
        supabase
          .from("users")
          .select("id, first_name, last_name, image_url, bio")
          .eq("id", userId)
          .single(),
        supabase
          .from("posts")
          .select("id, content, media_url, created_at")
          .eq("author_id", userId)
          .order("created_at", { ascending: false }),
      ]);

    if (userError) {
      console.error("fetch profile error:", userError);
    } else {
      setProfile(userData as UserProfile);
    }

    if (postsError) {
      console.error("fetch posts error:", postsError);
    } else {
      setPosts(postsData || []);
      setPostsCount(postsData?.length || 0);
    }

    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId)
        .eq("status", "accepted"),
      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId)
        .eq("status", "accepted"),
    ]);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);

    if (dbUserId && dbUserId !== userId) {
      const { data: followData, error: followError } = await supabase
        .from("follows")
        .select("id, status")
        .eq("follower_id", dbUserId)
        .eq("following_id", userId)
        .maybeSingle();

      if (followError) {
        console.error("fetch follow status error:", followError);
      } else {
        setFollowStatus((followData?.status as FollowStatus) || "none");
      }
    }

    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
  };

  const sendFollowRequest = async () => {
    if (!currentDbUserId || !userId || actionBusy) return;

    setActionBusy(true);

    const { error } = await supabase.from("follows").insert({
      follower_id: currentDbUserId,
      following_id: userId,
      status: "pending",
    });

    if (error) {
      console.error("sendFollowRequest error:", error);
      Alert.alert("Error", "Could not send follow request.");
    } else {
      setFollowStatus("pending");
    }

    setActionBusy(false);
  };

  const cancelFollowRequest = async () => {
    if (!currentDbUserId || !userId || actionBusy) return;

    setActionBusy(true);

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentDbUserId)
      .eq("following_id", userId);

    if (error) {
      console.error("cancelFollowRequest error:", error);
      Alert.alert("Error", "Could not cancel request.");
    } else {
      setFollowStatus("none");
    }

    setActionBusy(false);
  };

  const unfollow = async () => {
    if (!currentDbUserId || !userId || actionBusy) return;

    setActionBusy(true);

    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", currentDbUserId)
      .eq("following_id", userId);

    if (error) {
      console.error("unfollow error:", error);
      Alert.alert("Error", "Could not unfollow.");
    } else {
      setFollowStatus("none");
      setFollowersCount((prev) => Math.max(0, prev - 1));
    }

    setActionBusy(false);
  };

  const renderFollowButton = () => {
    if (!currentDbUserId || currentDbUserId === userId) return null;

    if (followStatus === "accepted") {
      return (
        <TouchableOpacity
          onPress={unfollow}
          disabled={actionBusy}
          className="mt-4 bg-gray-200 rounded-xl py-3 items-center"
        >
          <Text className="font-semibold text-black">
            {actionBusy ? "Loading..." : "Following"}
          </Text>
        </TouchableOpacity>
      );
    }

    if (followStatus === "pending") {
      return (
        <TouchableOpacity
          onPress={cancelFollowRequest}
          disabled={actionBusy}
          className="mt-4 bg-gray-200 rounded-xl py-3 items-center"
        >
          <Text className="font-semibold text-black">
            {actionBusy ? "Loading..." : "Requested"}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        onPress={sendFollowRequest}
        disabled={actionBusy}
        className="mt-4 bg-blue-500 rounded-xl py-3 items-center"
      >
        <Text className="font-semibold text-white">
          {actionBusy ? "Loading..." : "Follow"}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View className="px-4 pt-14 pb-6">
            <View className="flex-row items-center justify-between mb-6">
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={26} color="black" />
              </TouchableOpacity>
              <Text className="text-lg font-bold text-black">
                {formatDisplayName(profile || undefined)}
              </Text>
              <View style={{ width: 26 }} />
            </View>

            <View className="flex-row items-center">
              <Image
                source={{
                  uri: profile?.image_url || "https://placehold.co/100x100/png",
                }}
                className="w-24 h-24 rounded-full"
              />

              <View className="flex-1 flex-row justify-around ml-6">
                <View className="items-center">
                  <Text className="text-lg font-bold text-black">{postsCount}</Text>
                  <Text className="text-gray-600">Posts</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-black">{followersCount}</Text>
                  <Text className="text-gray-600">Followers</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-black">{followingCount}</Text>
                  <Text className="text-gray-600">Following</Text>
                </View>
              </View>
            </View>

            <View className="mt-4">
              <Text className="font-semibold text-black text-base">
                {formatDisplayName(profile || undefined)}
              </Text>
              {!!profile?.bio && (
                <Text className="text-black mt-1">{profile.bio}</Text>
              )}
            </View>

            {renderFollowButton()}
          </View>
        }
        columnWrapperStyle={{ gap: 2 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const imageUrl = item.media_url
            ? (() => {
                try {
                  const parsed = JSON.parse(item.media_url);
                  return Array.isArray(parsed) ? parsed[0] : item.media_url;
                } catch {
                  return item.media_url;
                }
              })()
            : null;

          return (
            <View
              style={{ width: "33.333%", aspectRatio: 1, padding: 1 }}
            >
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View className="flex-1 bg-gray-100 items-center justify-center px-2">
                  <Text numberOfLines={4} className="text-xs text-black text-center">
                    {item.content}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-gray-500">No posts yet.</Text>
          </View>
        }
      />
    </View>
  );
}