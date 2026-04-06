import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUser } from "@clerk/expo";

import SwipeScreen from "@/components/SwipeScreen";
import FollowButton from "@/components/FollowButton";
import { supabase } from "@/lib/supabase";
import { formatDisplayName, parseMediaUrls } from "@/lib/social";
import { useTabBarAnimation } from "../(home)/_layout";

type ProfileUser = {
  id: string;
  clerk_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  bio: string | null;
  school_name: string | null;
  state: string | null;
  is_private: boolean;
  created_at: string;
  updated_at: string;
};

type ProfilePost = {
  id: string;
  content: string;
  media_url: string | null;
  created_at: string;
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { setCollapsed } = useTabBarAnimation();

  const lastY = useRef(0);

  const [currentDbUserId, setCurrentDbUserId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postsCount, setPostsCount] = useState(0);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const loadCurrentDbUser = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user?.id) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("loadCurrentDbUser error:", error);
      return null;
    }

    const dbId = data?.id ?? null;
    setCurrentDbUserId(dbId);
    return dbId;
  }, [isLoaded, isSignedIn, user?.id]);

  const loadProfileData = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingProfile(true);
      setError(null);

      await loadCurrentDbUser();

      const { data: profileData, error: profileError } = await supabase
        .from("users")
        .select(`
          id,
          clerk_user_id,
          email,
          first_name,
          last_name,
          image_url,
          bio,
          school_name,
          state,
          is_private,
          created_at,
          updated_at
        `)
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      setProfileUser(profileData as ProfileUser);

      const [
        followersResult,
        followingResult,
        postsCountResult,
        postsResult,
      ] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userId),

        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", userId),

        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", userId),

        supabase
          .from("posts")
          .select("id, content, media_url, created_at")
          .eq("author_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      setFollowersCount(followersResult.count || 0);
      setFollowingCount(followingResult.count || 0);
      setPostsCount(postsCountResult.count || 0);

      if (postsResult.error) throw postsResult.error;
      setPosts((postsResult.data || []) as ProfilePost[]);
    } catch (err: any) {
      console.error("loadProfileData error:", err);
      setError(err?.message ?? "Failed to load profile.");
    } finally {
      setLoadingProfile(false);
    }
  }, [userId, loadCurrentDbUser]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const isOwnProfile = !!currentDbUserId && currentDbUserId === userId;

  const fullName = useMemo(() => {
    return formatDisplayName(profileUser || undefined) || "User";
  }, [profileUser]);

  const profileEmail = profileUser?.email || "No email available";
  const imageUrl = profileUser?.image_url || "https://i.pravatar.cc/300";

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
    );
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
    );
  }

  if (!profileUser) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-xl font-bold text-slate-900">Profile not found</Text>
            {error ? (
              <Text className="mt-2 text-center text-slate-500">{error}</Text>
            ) : null}
          </View>
        </SafeAreaView>
      </SwipeScreen>
    );
  }

  return (
    <SwipeScreen>
      <SafeAreaView className="flex-1 bg-slate-50">
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          numColumns={3}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          contentContainerStyle={{ paddingBottom: 120 }}
          columnWrapperStyle={{
            paddingHorizontal: 5,
            gap: 5,
          }}
          ListHeaderComponent={
            <View className="px-5 pt-4">
              <View className="flex-row items-center justify-between">
                <Pressable
                  onPress={() => router.back()}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white"
                >
                  <Ionicons name="arrow-back" size={22} color="#0F172A" />
                </Pressable>

                <View className="flex-1 px-4">
                  <Text className="text-center text-sm font-medium text-slate-500">
                    Member Profile
                  </Text>
                  <Text
                    className="mt-1 text-center text-2xl font-bold text-slate-900"
                    numberOfLines={1}
                  >
                    {fullName}
                  </Text>
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

              <View className="mt-6 overflow-hidden rounded-[32px] bg-slate-900">
                <Image
                  source={{ uri: imageUrl }}
                  className="absolute inset-0 h-full w-full opacity-35"
                  blurRadius={35}
                />

                <View className="absolute inset-0 bg-black/35" />

                <View className="px-5 pb-6 pt-7">
                  <View className="flex-row items-start">
                    <Image
                      source={{ uri: imageUrl }}
                      className="h-24 w-24 rounded-full border-2 border-white"
                    />

                    <View className="ml-4 flex-1">
                      <Text className="text-3xl font-bold text-white" numberOfLines={2}>
                        {fullName}
                      </Text>

                      <Text
                        className="mt-1 text-sm text-slate-200"
                        numberOfLines={1}
                      >
                        {profileEmail}
                      </Text>

                      <View className="mt-3 flex-row flex-wrap items-center">
                        {profileUser.state ? (
                          <View className="mr-2 mb-2 rounded-full bg-blue-500/90 px-3 py-1">
                            <Text className="text-xs font-bold uppercase tracking-wide text-white">
                              {profileUser.state}
                            </Text>
                          </View>
                        ) : null}

                        <View className="mr-2 mb-2 rounded-full bg-white/20 px-3 py-1">
                          <Text className="text-xs font-semibold uppercase tracking-wide text-white">
                            {profileUser.is_private ? "Private Account" : "Public Account"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text className="mt-5 text-sm leading-6 text-slate-100">
                    {profileUser.bio?.trim()
                      ? profileUser.bio
                      : "This member is staying connected with events, competitions, announcements, and chapter activity across the community."}
                  </Text>

                  {profileUser.school_name ? (
                    <Text className="mt-3 text-sm text-slate-200">
                      {profileUser.school_name}
                    </Text>
                  ) : null}

                  <View className="mt-6 flex-row justify-between rounded-[24px] bg-white/12 px-4 py-4">
                    <View className="items-center flex-1">
                      <Text className="text-2xl font-bold text-white">{followingCount}</Text>
                      <Text className="mt-1 text-xs font-medium text-slate-200">
                        Following
                      </Text>
                    </View>

                    <View className="items-center flex-1">
                      <Text className="text-2xl font-bold text-white">{followersCount}</Text>
                      <Text className="mt-1 text-xs font-medium text-slate-200">
                        Followers
                      </Text>
                    </View>

                    <View className="items-center flex-1">
                      <Text className="text-2xl font-bold text-white">{postsCount}</Text>
                      <Text className="mt-1 text-xs font-medium text-slate-200">
                        Posts
                      </Text>
                    </View>
                  </View>

                  {!isOwnProfile ? (
                    <View className="mt-5">
                      <FollowButton
                        currentDbUserId={currentDbUserId}
                        targetUserId={profileUser.id}
                        targetIsPrivate={profileUser.is_private}
                        onChange={loadProfileData}
                      />
                    </View>
                  ) : null}
                </View>
              </View>

              <View className="mt-6 rounded-[24px] bg-white p-5">
                <Text className="text-lg font-bold text-slate-900">About</Text>
                <Text className="mt-3 text-sm leading-6 text-slate-600">
                  {profileUser.bio?.trim()
                    ? profileUser.bio
                    : "This profile is connected to Clerk authentication and your Supabase users table."}
                </Text>
              </View>

              <View className="mt-6 mb-3 flex-row items-center justify-center">
                <View className="flex-row items-center rounded-2xl bg-white px-5 py-3">
                  <Ionicons name="grid-outline" size={20} color="#0F172A" />
                  <Text className="ml-2 text-base font-semibold text-slate-900">
                    Posts
                  </Text>
                </View>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const images = parseMediaUrls(item.media_url);
            const firstImage = images[0];

            return (
              <Pressable
                style={{
                  width: "32%",
                  aspectRatio: 1,
                  marginBottom: 5,
                  borderRadius: 18,
                  overflow: "hidden",
                  backgroundColor: "#E5E7EB",
                }}
              >
                {firstImage ? (
                  <Image
                    source={{ uri: firstImage }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-slate-200 px-2">
                    <Text
                      numberOfLines={5}
                      className="text-center text-xs font-medium text-slate-700"
                    >
                      {item.content}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View className="items-center px-6 py-14">
              <Text className="text-lg font-semibold text-slate-900">
                No posts yet
              </Text>
              <Text className="mt-2 text-center text-slate-500">
                This user has not posted anything yet.
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </SwipeScreen>
  );
}