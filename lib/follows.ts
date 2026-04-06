import { supabase } from "@/lib/supabase";

export type FollowState = "self" | "following" | "requested" | "not_following";

export async function getFollowState(
  currentDbUserId: string | null,
  targetUserId: string
): Promise<FollowState> {
  if (!currentDbUserId) return "not_following";
  if (currentDbUserId === targetUserId) return "self";

  const { data: followData, error: followError } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", currentDbUserId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (followError) {
    console.error("getFollowState follows error:", followError);
  }

  if (followData) return "following";

  const { data: requestData, error: requestError } = await supabase
    .from("follow_requests")
    .select("id, status")
    .eq("requester_id", currentDbUserId)
    .eq("requested_id", targetUserId)
    .eq("status", "pending")
    .maybeSingle();

  if (requestError) {
    console.error("getFollowState requests error:", requestError);
  }

  if (requestData) return "requested";

  return "not_following";
}

export async function followUser(
  currentDbUserId: string,
  targetUserId: string,
  targetIsPrivate: boolean
) {
  if (currentDbUserId === targetUserId) return { type: "self" as const };

  if (targetIsPrivate) {
    const { error } = await supabase.from("follow_requests").upsert(
      {
        requester_id: currentDbUserId,
        requested_id: targetUserId,
        status: "pending",
      },
      {
        onConflict: "requester_id,requested_id",
      }
    );

    if (error) throw error;

    return { type: "requested" as const };
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: currentDbUserId,
    following_id: targetUserId,
  });

  if (error) throw error;

  return { type: "following" as const };
}

export async function unfollowUser(
  currentDbUserId: string,
  targetUserId: string
) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", currentDbUserId)
    .eq("following_id", targetUserId);

  if (error) throw error;
}

export async function cancelFollowRequest(
  currentDbUserId: string,
  targetUserId: string
) {
  const { error } = await supabase
    .from("follow_requests")
    .delete()
    .eq("requester_id", currentDbUserId)
    .eq("requested_id", targetUserId)
    .eq("status", "pending");

  if (error) throw error;
}