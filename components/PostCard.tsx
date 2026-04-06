import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { LayoutChangeEvent, GestureResponderEvent } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { formatDisplayName, parseMediaUrls } from "@/lib/social";
import ImageCarousel from "./ImageCarousel";
import CommentsModal from "./CommentsModal";
import {
  cancelFollowRequest,
  followUser,
  getFollowState,
  unfollowUser,
  type FollowState,
} from "@/lib/follows";

type Props = {
  post: any;
  refresh: () => Promise<void> | void;
  currentDbUserId: string | null;
};

const DOUBLE_TAP_DELAY = 280;
const FLOATING_HEART_SIZE = 110;

export default function PostCard({ post, refresh, currentDbUserId }: Props) {
  const router = useRouter();

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(false);

  const [followState, setFollowState] = useState<FollowState>("not_following");
  const [followBusy, setFollowBusy] = useState(false);

  const images = useMemo(() => parseMediaUrls(post.media_url), [post.media_url]);

  const likesCount = post.post_likes?.[0]?.count || 0;
  const commentsCount = post.post_comments?.[0]?.count || 0;

  const lastTapRef = useRef(0);

  const mediaLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const heartButtonLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const heartOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(0.35)).current;
  const heartTranslateX = useRef(new Animated.Value(0)).current;
  const heartTranslateY = useRef(new Animated.Value(0)).current;

  const authorId = post.author?.id || post.author_id;
  const isOwnPost = !!currentDbUserId && authorId === currentDbUserId;
  const targetIsPrivate = !!post.author?.is_private;

  const openAuthorProfile = () => {
    if (!authorId) return;

    if (isOwnPost) {
      router.push("/profile");
      return;
    }

    router.push({
      pathname: "/profile/[userId]",
      params: { userId: authorId },
    });
  };

  const checkIfLiked = async () => {
    if (!currentDbUserId) return;

    const { data, error } = await supabase
      .from("post_likes")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentDbUserId)
      .maybeSingle();

    if (error) {
      console.error("checkIfLiked error:", error);
      return;
    }

    setLiked(!!data);
  };

  const checkIfSaved = async () => {
    if (!currentDbUserId) return;

    const { data, error } = await supabase
      .from("saved_posts")
      .select("id")
      .eq("post_id", post.id)
      .eq("user_id", currentDbUserId)
      .maybeSingle();

    if (error) {
      console.error("checkIfSaved error:", error);
      return;
    }

    setSaved(!!data);
  };

  const checkFollowState = async () => {
    if (!authorId) return;

    const nextState = await getFollowState(currentDbUserId, authorId);
    setFollowState(nextState);
  };

  useEffect(() => {
    checkIfLiked();
    checkIfSaved();
    checkFollowState();
  }, [post.id, currentDbUserId, authorId]);

  const toggleLike = async (forceLike?: boolean) => {
    if (!currentDbUserId || likeBusy) return;

    const shouldLike = forceLike ?? !liked;
    setLikeBusy(true);

    if (!shouldLike) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentDbUserId);

      if (error) {
        console.error("unlike error:", error);
      } else {
        setLiked(false);
        await refresh();
      }
    } else {
      if (liked) {
        setLikeBusy(false);
        return;
      }

      const { error } = await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: currentDbUserId,
      });

      if (error) {
        console.error("like error:", error);
      } else {
        setLiked(true);
        await refresh();
      }
    }

    setLikeBusy(false);
  };

  const toggleSave = async () => {
    if (!currentDbUserId || saveBusy) return;

    setSaveBusy(true);

    if (saved) {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentDbUserId);

      if (error) {
        console.error("unsave error:", error);
      } else {
        setSaved(false);
        void Haptics.selectionAsync();
      }
    } else {
      const { error } = await supabase.from("saved_posts").insert({
        post_id: post.id,
        user_id: currentDbUserId,
      });

      if (error) {
        console.error("save error:", error);
      } else {
        setSaved(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    setSaveBusy(false);
  };

  const handleShare = async () => {
    if (shareBusy) return;

    try {
      setShareBusy(true);

      const shareParts: string[] = [];

      if (post.title) shareParts.push(post.title);
      if (post.content) shareParts.push(post.content);

      if (post.external_link) {
        shareParts.push(post.external_link);
      } else if (images.length > 0) {
        shareParts.push(images[0]);
      }

      const message = shareParts.join("\n\n").trim() || "Check out this post";

      const result = await Share.share({
        message,
        url: post.external_link || (images.length > 0 ? images[0] : undefined),
        title: post.title || "Share post",
      });

      if (result.action === Share.sharedAction && currentDbUserId) {
        const { error: shareInsertError } = await supabase
          .from("post_shares")
          .insert({
            post_id: post.id,
            user_id: currentDbUserId,
            platform: "native_share",
          });

        if (shareInsertError) {
          console.error("post_shares insert error:", shareInsertError);
        }

        const { error: updatePostError } = await supabase
          .from("posts")
          .update({
            share_count: (post.share_count || 0) + 1,
          })
          .eq("id", post.id);

        if (updatePostError) {
          console.error("posts share_count update error:", updatePostError);
        }

        void Haptics.selectionAsync();
        await refresh();
      }
    } catch (error) {
      console.error("share error:", error);
      Alert.alert("Share failed", "Could not share this post.");
    } finally {
      setShareBusy(false);
    }
  };

  const handleFollowPress = async () => {
    if (!currentDbUserId || !authorId || isOwnPost || followBusy) return;

    try {
      setFollowBusy(true);

      if (followState === "following") {
        await unfollowUser(currentDbUserId, authorId);
        setFollowState("not_following");
        void Haptics.selectionAsync();
      } else if (followState === "requested") {
        await cancelFollowRequest(currentDbUserId, authorId);
        setFollowState("not_following");
        void Haptics.selectionAsync();
      } else {
        const result = await followUser(
          currentDbUserId,
          authorId,
          targetIsPrivate
        );

        setFollowState(result.type === "requested" ? "requested" : "following");
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("handleFollowPress error:", error);
      Alert.alert("Action failed", "Please try again.");
    } finally {
      setFollowBusy(false);
    }
  };

  const playFloatingHeartAnimation = (tapXInCard: number, tapYInCard: number) => {
    const heartCenterX =
      heartButtonLayoutRef.current.x + heartButtonLayoutRef.current.width / 2;
    const heartCenterY =
      heartButtonLayoutRef.current.y + heartButtonLayoutRef.current.height / 2;

    const startX = tapXInCard - FLOATING_HEART_SIZE / 2;
    const startY = tapYInCard - FLOATING_HEART_SIZE / 2;
    const endX = heartCenterX - FLOATING_HEART_SIZE / 2;
    const endY = heartCenterY - FLOATING_HEART_SIZE / 2;

    heartTranslateX.setValue(startX);
    heartTranslateY.setValue(startY);
    heartOpacity.setValue(0);
    heartScale.setValue(0.35);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 1.12,
          duration: 180,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(heartTranslateX, {
          toValue: endX,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartTranslateY, {
          toValue: endY,
          duration: 500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartScale, {
          toValue: 0.18,
          duration: 500,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 540,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleDoubleTapLike = async (event: GestureResponderEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeSinceLastTap > DOUBLE_TAP_DELAY) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tapXInCard = mediaLayoutRef.current.x + event.nativeEvent.locationX;
    const tapYInCard = mediaLayoutRef.current.y + event.nativeEvent.locationY;

    playFloatingHeartAnimation(tapXInCard, tapYInCard);

    if (!liked) {
      await toggleLike(true);
    }
  };

  const onMediaLayout = (event: LayoutChangeEvent) => {
    mediaLayoutRef.current = event.nativeEvent.layout;
  };

  const onHeartButtonLayout = (event: LayoutChangeEvent) => {
    heartButtonLayoutRef.current = event.nativeEvent.layout;
  };

  const showInlineFollowButton =
    !isOwnPost && followState !== "following" && followState !== "self";

  return (
    <View className="bg-white mb-5 relative">
      <View className="px-4 py-3 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={openAuthorProfile}
          activeOpacity={0.8}
          className="flex-row items-center flex-1 mr-3"
        >
          <Image
            source={{
              uri: post.author?.image_url || "https://placehold.co/100x100/png",
            }}
            className="w-9 h-9 rounded-full mr-3"
          />

          <View className="flex-1">
            <View className="flex-row items-center flex-wrap">
              <Text
                className="font-semibold text-black mr-2"
                numberOfLines={1}
              >
                {formatDisplayName(post.author || undefined)}
              </Text>

              {post.author?.state ? (
                <View className="rounded-full bg-slate-100 px-2.5 py-1">
                  <Text className="text-[10px] font-bold uppercase tracking-wide text-slate-700">
                    {post.author.state}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </TouchableOpacity>

        {showInlineFollowButton ? (
          <TouchableOpacity
            onPress={handleFollowPress}
            activeOpacity={0.8}
            disabled={followBusy}
            className={`h-8 px-4 rounded-xl items-center justify-center ${
              followState === "requested" ? "bg-slate-200" : "bg-blue-500"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                followState === "requested" ? "text-slate-800" : "text-white"
              }`}
            >
              {followBusy
                ? "..."
                : followState === "requested"
                ? "Requested"
                : "Follow"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {images.length > 0 ? (
        <View onLayout={onMediaLayout} onTouchEnd={handleDoubleTapLike}>
          <ImageCarousel images={images} />
        </View>
      ) : (
        <View
          onLayout={onMediaLayout}
          className="mx-4 mb-3"
          onTouchEnd={handleDoubleTapLike}
        >
          <View className="rounded-2xl bg-gray-100 px-4 py-6">
            <Text className="text-black">{post.content}</Text>
          </View>
        </View>
      )}

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          opacity: heartOpacity,
          transform: [
            { translateX: heartTranslateX },
            { translateY: heartTranslateY },
            { scale: heartScale },
          ],
        }}
      >
        <Ionicons name="heart" size={FLOATING_HEART_SIZE} color="white" />
      </Animated.View>

      <View className="px-4 pt-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => toggleLike()}
            onLayout={onHeartButtonLayout}
            className="mr-4"
            activeOpacity={0.7}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={28}
              color={liked ? "#ef4444" : "black"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCommentsVisible(true)}
            className="mr-4"
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={26} color="black" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={shareBusy}
          >
            <Ionicons name="paper-plane-outline" size={26} color="black" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={toggleSave}
          activeOpacity={0.7}
          disabled={saveBusy}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={25}
            color="black"
          />
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-2 pb-1">
        <Text className="font-semibold text-black">{likesCount} likes</Text>

        {post.content ? (
          <Text className="mt-1 text-black">
            <Text className="font-semibold">
              {formatDisplayName(post.author || undefined)}{" "}
            </Text>
            {post.content}
          </Text>
        ) : null}

        <TouchableOpacity onPress={() => setCommentsVisible(true)}>
          <Text className="mt-2 text-gray-500">
            View all {commentsCount} comments
          </Text>
        </TouchableOpacity>
      </View>

      <CommentsModal
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        postId={post.id}
        currentDbUserId={currentDbUserId}
        onCommentAdded={refresh}
      />
    </View>
  );
}