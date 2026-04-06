import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { supabase } from "@/lib/supabase";
import { formatDisplayName } from "@/lib/social";

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  } | null;
};

type CurrentUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
} | null;

type Props = {
  visible: boolean;
  onClose: () => void;
  postId: string;
  currentDbUserId: string | null;
  onCommentAdded?: () => void;
};

const WINDOW_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = WINDOW_HEIGHT * 0.82;
const CLOSE_THRESHOLD = 140;
const VELOCITY_THRESHOLD = 1.2;

function formatCommentDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (diffMs < minute) return "Now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h`;
  if (diffMs < week) return `${Math.floor(diffMs / day)}d`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function CommentsModal({
  visible,
  onClose,
  postId,
  currentDbUserId,
  onCommentAdded,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>(
    {}
  );

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Comment>>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollOffsetRef = useRef(0);

  const goToProfile = (userId: string | null | undefined) => {
    if (!userId) return;

    onClose();

    router.push({
      pathname: "/profile/[userId]",
      params: { userId },
    });
  };

  const fetchComments = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("post_comments")
      .select(`
        id,
        content,
        created_at,
        user:users!post_comments_user_id_fkey (
          id,
          first_name,
          last_name,
          image_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchComments error:", error);
    } else {
      setComments((data || []) as Comment[]);
    }

    setLoading(false);
  };

  const fetchCurrentUser = async () => {
    if (!currentDbUserId) {
      setCurrentUser(null);
      return;
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, image_url")
      .eq("id", currentDbUserId)
      .single();

    if (error) {
      console.error("fetchCurrentUser error:", error);
      setCurrentUser(null);
      return;
    }

    setCurrentUser(data as CurrentUser);
  };

  const animateOpen = () => {
    dragY.setValue(0);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateClose = () => {
    Keyboard.dismiss();
    setIsDragging(false);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dragY, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const snapBack = () => {
    setIsDragging(false);

    Animated.parallel([
      Animated.spring(dragY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 90,
        friction: 12,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    if (visible) {
      fetchComments();
      fetchCurrentUser();
      animateOpen();
    } else {
      translateY.setValue(SHEET_HEIGHT);
      dragY.setValue(0);
      backdropOpacity.setValue(0);
      setKeyboardHeight(0);
      setIsDragging(false);
    }
  }, [visible, postId, currentDbUserId]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (comments.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [comments.length]);

  const addComment = async () => {
    const trimmed = commentText.trim();
    if (!trimmed || !currentDbUserId || sending) return;

    setSending(true);

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentDbUserId,
      content: trimmed,
    });

    if (error) {
      console.error("addComment error:", error);
      setSending(false);
      return;
    }

    setCommentText("");
    await fetchComments();
    onCommentAdded?.();
    setSending(false);
  };

  const toggleCommentHeart = (commentId: string) => {
    setLikedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const canPost = !!commentText.trim() && !!currentDbUserId;
  const composerBottom =
    keyboardHeight > 0 ? keyboardHeight - insets.bottom : 0;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const isVertical =
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const pullingDown = gestureState.dy > 6;
        const atTop = scrollOffsetRef.current <= 0;

        if (keyboardHeight > 0) return false;

        return isVertical && pullingDown && atTop;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (_, gestureState) => {
        const y = Math.max(0, gestureState.dy);
        dragY.setValue(y);

        const progress = Math.min(y / SHEET_HEIGHT, 1);
        backdropOpacity.setValue(1 - progress * 0.45);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose =
          gestureState.dy > CLOSE_THRESHOLD ||
          gestureState.vy > VELOCITY_THRESHOLD;

        if (shouldClose) {
          animateClose();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => {
        snapBack();
      },
    })
  ).current;

  const combinedTranslateY = Animated.add(translateY, dragY);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={animateClose}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "black",
            opacity: backdropOpacity.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.35],
            }),
          }}
        />

        <Pressable
          onPress={animateClose}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: SHEET_HEIGHT - 24,
          }}
        />

        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: SHEET_HEIGHT,
            transform: [{ translateY: combinedTranslateY }],
            backgroundColor: "white",
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: "hidden",
          }}
        >
          <View style={{ flex: 1 }}>
            <View
              {...panResponder.panHandlers}
              style={{
                paddingTop: 10,
                paddingBottom: 8,
                alignItems: "center",
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
                backgroundColor: "white",
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 4,
                  borderRadius: 999,
                  backgroundColor: "#D1D5DB",
                  marginBottom: 12,
                }}
              />
              <View
                style={{
                  width: "100%",
                  paddingHorizontal: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ width: 36 }} />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "black",
                  }}
                >
                  Comments
                </Text>
                <TouchableOpacity
                  onPress={animateClose}
                  activeOpacity={0.8}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={24} color="black" />
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              >
                <ActivityIndicator />
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={comments}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(e) => {
                  scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
                }}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 90 + composerBottom,
                  flexGrow: comments.length === 0 ? 1 : 0,
                }}
                ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
                renderItem={({ item }) => {
                  const isLiked = !!likedComments[item.id];

                  return (
                    <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                      <TouchableOpacity
                        onPress={() => goToProfile(item.user?.id)}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{
                            uri:
                              item.user?.image_url ||
                              "https://placehold.co/100x100/png",
                          }}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            marginRight: 10,
                            backgroundColor: "#E5E7EB",
                          }}
                        />
                      </TouchableOpacity>

                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={{ fontSize: 14, color: "black", lineHeight: 20 }}>
                          <Text
                            style={{ fontWeight: "700" }}
                            onPress={() => goToProfile(item.user?.id)}
                          >
                            {formatDisplayName(item.user || undefined)}
                          </Text>
                          <Text> </Text>
                          <Text>{item.content}</Text>
                        </Text>

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 6,
                            gap: 12,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                              fontWeight: "500",
                            }}
                          >
                            {formatCommentDate(item.created_at)}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => toggleCommentHeart(item.id)}
                        activeOpacity={0.7}
                        style={{
                          paddingTop: 2,
                          paddingHorizontal: 4,
                          paddingBottom: 4,
                        }}
                      >
                        <Ionicons
                          name={isLiked ? "heart" : "heart-outline"}
                          size={16}
                          color={isLiked ? "#FF3040" : "#262626"}
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View
                    style={{
                      flex: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingBottom: 40,
                    }}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={34}
                      color="#9CA3AF"
                    />
                    <Text
                      style={{
                        marginTop: 10,
                        color: "#6B7280",
                        fontSize: 16,
                        fontWeight: "600",
                      }}
                    >
                      No comments yet
                    </Text>
                    <Text
                      style={{ marginTop: 4, color: "#9CA3AF", fontSize: 14 }}
                    >
                      Start the conversation.
                    </Text>
                  </View>
                }
              />
            )}

            <View
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                transform: [{ translateY: -composerBottom }],
                borderTopWidth: 1,
                borderTopColor: "#E5E7EB",
                paddingHorizontal: 12,
                paddingTop: 10,
                paddingBottom: Math.max(insets.bottom, 10),
                backgroundColor: "white",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 10,
                }}
              >
                <Image
                  source={{
                    uri:
                      currentUser?.image_url ||
                      "https://placehold.co/100x100/png",
                  }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "#E5E7EB",
                    marginBottom: 6,
                  }}
                />

                <View
                  style={{
                    flex: 1,
                    minHeight: 44,
                    maxHeight: 110,
                    borderRadius: 22,
                    backgroundColor: "#F3F4F6",
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    justifyContent: "center",
                  }}
                >
                  <TextInput
                    ref={inputRef}
                    value={commentText}
                    onChangeText={setCommentText}
                    placeholder="Add a comment..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                    style={{
                      fontSize: 15,
                      color: "black",
                      paddingTop: 0,
                      paddingBottom: 0,
                    }}
                  />
                </View>

                <TouchableOpacity
                  onPress={addComment}
                  disabled={!canPost || sending}
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 6,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isDragging ? 0.7 : 1,
                  }}
                >
                  {sending ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: canPost ? "#0095F6" : "#9CA3AF",
                      }}
                    >
                      Post
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}