import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";

import {
  FollowState,
  cancelFollowRequest,
  followUser,
  getFollowState,
  unfollowUser,
} from "@/lib/follows";

type Props = {
  currentDbUserId: string | null;
  targetUserId: string;
  targetIsPrivate?: boolean;
  onChange?: () => void;
};

export default function FollowButton({
  currentDbUserId,
  targetUserId,
  targetIsPrivate = false,
  onChange,
}: Props) {
  const [state, setState] = useState<FollowState>("not_following");
  const [busy, setBusy] = useState(false);

  const loadState = async () => {
    const next = await getFollowState(currentDbUserId, targetUserId);
    setState(next);
  };

  useEffect(() => {
    loadState();
  }, [currentDbUserId, targetUserId]);

  const handlePress = async () => {
    if (!currentDbUserId || busy) return;
    if (state === "self") return;

    try {
      setBusy(true);

      if (state === "following") {
        await unfollowUser(currentDbUserId, targetUserId);
        setState("not_following");
        void Haptics.selectionAsync();
      } else if (state === "requested") {
        await cancelFollowRequest(currentDbUserId, targetUserId);
        setState("not_following");
        void Haptics.selectionAsync();
      } else {
        const result = await followUser(
          currentDbUserId,
          targetUserId,
          targetIsPrivate
        );

        setState(result.type === "requested" ? "requested" : "following");
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      onChange?.();
    } catch (error) {
      console.error("FollowButton error:", error);
      Alert.alert("Action failed", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "self") return null;

  const label =
    state === "following"
      ? "Following"
      : state === "requested"
      ? "Requested"
      : "Follow";

  const bg =
    state === "following" || state === "requested" ? "#F3F4F6" : "#0095F6";

  const color =
    state === "following" || state === "requested" ? "#111827" : "white";

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={busy}
      style={{
        height: 36,
        minWidth: 110,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Text
          style={{
            color,
            fontSize: 14,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}