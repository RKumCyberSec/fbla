import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/expo";

import SwipeScreen from "@/components/SwipeScreen";
import { supabase } from "@/lib/supabase";

type DbUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  school_id: string | null;
  role: string | null;
};

type School = {
  id: string;
  name: string;
};

type SchoolChat = {
  id: string;
  school_id: string;
  name: string | null;
};

type MessageRow = {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type HydratedMessage = {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    role: string | null;
  } | null;
};

function formatDisplayName(firstName: string | null, lastName: string | null) {
  const full = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return full.length ? full : "User";
}

function getInitials(firstName: string | null, lastName: string | null) {
  const first = firstName?.[0] ?? "";
  const last = lastName?.[0] ?? "";
  const value = `${first}${last}`.toUpperCase();
  return value || "U";
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRole(role: string | null) {
  if (!role) return "Member";

  switch (role) {
    case "advisor":
      return "Advisor";
    case "chapter_officer":
      return "Chapter Officer";
    case "state_officer":
      return "State Officer";
    case "national_officer":
      return "National Officer";
    case "admin":
      return "Admin";
    case "member":
    default:
      return "Member";
  }
}

function RoleBadge({ role }: { role: string | null }) {
  const label = formatRole(role);

  const isAdvisor = role === "advisor";
  const isAdmin = role === "admin";
  const isOfficer =
    role === "chapter_officer" ||
    role === "state_officer" ||
    role === "national_officer";

  const badgeClass = isAdvisor
    ? "bg-amber-100"
    : isAdmin
    ? "bg-red-100"
    : isOfficer
    ? "bg-blue-100"
    : "bg-zinc-100";

  const textClass = isAdvisor
    ? "text-amber-700"
    : isAdmin
    ? "text-red-700"
    : isOfficer
    ? "text-blue-700"
    : "text-zinc-700";

  return (
    <View className={`ml-2 rounded-full px-2 py-1 ${badgeClass}`}>
      <Text className={`text-[10px] font-semibold ${textClass}`}>{label}</Text>
    </View>
  );
}

function Avatar({
  imageUrl,
  firstName,
  lastName,
  size = 34,
}: {
  imageUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  size?: number;
}) {
  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      className="items-center justify-center rounded-full bg-zinc-200"
      style={{ width: size, height: size, borderRadius: size / 2 }}
    >
      <Text className="text-xs font-semibold text-zinc-700">
        {getInitials(firstName, lastName)}
      </Text>
    </View>
  );
}

export default function ResourcesScreen() {
  const { user: clerkUser } = useUser();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [chat, setChat] = useState<SchoolChat | null>(null);
  const [messages, setMessages] = useState<HydratedMessage[]>([]);
  const [message, setMessage] = useState("");

  const flatListRef = useRef<FlatList<HydratedMessage>>(null);

  const schoolTitle = useMemo(() => {
    return school?.name || chat?.name || "School Chat";
  }, [school?.name, chat?.name]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const fetchCurrentDbUser = useCallback(async () => {
    if (!clerkUser?.id) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, image_url, school_id, role")
      .eq("clerk_user_id", clerkUser.id)
      .single();

    if (error) throw error;
    return data as DbUser;
  }, [clerkUser?.id]);

  const fetchSchool = useCallback(async (schoolId: string) => {
    const { data, error } = await supabase
      .from("schools")
      .select("id, name")
      .eq("id", schoolId)
      .single();

    if (error) throw error;
    return data as School;
  }, []);

  const getOrCreateSchoolChat = useCallback(async (schoolId: string) => {
    const { data: existing, error: existingError } = await supabase
      .from("school_chats")
      .select("id, school_id, name")
      .eq("school_id", schoolId)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      return existing as SchoolChat;
    }

    const { data: created, error: createError } = await supabase
      .from("school_chats")
      .insert({
        school_id: schoolId,
        name: "School Chat",
      })
      .select("id, school_id, name")
      .single();

    if (createError) throw createError;

    return created as SchoolChat;
  }, []);

  const fetchMessages = useCallback(async (chatId: string) => {
    const { data, error } = await supabase
      .from("school_chat_messages")
      .select("id, chat_id, user_id, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as MessageRow[];

    if (rows.length === 0) {
      setMessages([]);
      return;
    }

    const uniqueUserIds = [...new Set(rows.map((item) => item.user_id))];

    const { data: userRows, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, last_name, image_url, school_id, role")
      .in("id", uniqueUserIds);

    if (usersError) throw usersError;

    const usersMap = new Map(
      ((userRows ?? []) as DbUser[]).map((u) => [u.id, u])
    );

    const hydrated: HydratedMessage[] = rows.map((row) => {
      const msgUser = usersMap.get(row.user_id);

      return {
        ...row,
        user: msgUser
          ? {
              id: msgUser.id,
              first_name: msgUser.first_name,
              last_name: msgUser.last_name,
              image_url: msgUser.image_url,
              role: msgUser.role,
            }
          : null,
      };
    });

    setMessages(hydrated);
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const currentDbUser = await fetchCurrentDbUser();
      setDbUser(currentDbUser);

      if (!currentDbUser) {
        setError("Could not find your user profile.");
        return;
      }

      if (!currentDbUser.school_id) {
        setError("You need to set your school first before using the school chat.");
        return;
      }

      const schoolData = await fetchSchool(currentDbUser.school_id);
      setSchool(schoolData);

      const schoolChat = await getOrCreateSchoolChat(currentDbUser.school_id);
      setChat(schoolChat);

      await fetchMessages(schoolChat.id);
    } catch (e: any) {
      console.error("Chat bootstrap error:", e);
      setError(e?.message ?? "Something went wrong loading the chat.");
    } finally {
      setLoading(false);
    }
  }, [fetchCurrentDbUser, fetchMessages, fetchSchool, getOrCreateSchoolChat]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!chat?.id) return;

    const channel = supabase
      .channel(`school-chat-${chat.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_chat_messages",
          filter: `chat_id=eq.${chat.id}`,
        },
        async () => {
          try {
            await fetchMessages(chat.id);
            scrollToBottom(true);
          } catch (e) {
            console.error("Realtime refresh error:", e);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat?.id, fetchMessages, scrollToBottom]);

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [loading, messages.length, scrollToBottom]);

  const handleSend = useCallback(async () => {
    if (!dbUser?.id || !chat?.id) return;

    const trimmed = message.trim();
    if (!trimmed || sending) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: HydratedMessage = {
      id: tempId,
      chat_id: chat.id,
      user_id: dbUser.id,
      content: trimmed,
      created_at: new Date().toISOString(),
      user: {
        id: dbUser.id,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        image_url: dbUser.image_url,
        role: dbUser.role,
      },
    };

    try {
      setSending(true);
      setError(null);

      setMessages((prev) => [...prev, optimisticMessage]);
      setMessage("");
      scrollToBottom(true);

      const { data, error } = await supabase
        .from("school_chat_messages")
        .insert({
          chat_id: chat.id,
          user_id: dbUser.id,
          content: trimmed,
        })
        .select("id, chat_id, user_id, content, created_at")
        .single();

      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessage(trimmed);
        throw error;
      }

      const savedRow = data as MessageRow;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                ...savedRow,
                user: {
                  id: dbUser.id,
                  first_name: dbUser.first_name,
                  last_name: dbUser.last_name,
                  image_url: dbUser.image_url,
                  role: dbUser.role,
                },
              }
            : m
        )
      );

      await fetchMessages(chat.id);
      scrollToBottom(true);
    } catch (e: any) {
      console.error("Send message error:", e);
      setError(e?.message ?? "Failed to send message.");
    } finally {
      setSending(false);
    }
  }, [chat?.id, dbUser, fetchMessages, message, scrollToBottom, sending]);

  const renderMessage = ({ item }: { item: HydratedMessage }) => {
    const isMine = item.user_id === dbUser?.id;
    const displayName = formatDisplayName(
      item.user?.first_name ?? null,
      item.user?.last_name ?? null
    );

    if (isMine) {
      return (
        <View className="mb-4 items-end px-4">
          <View className="max-w-[82%] rounded-[22px] rounded-br-md bg-black px-4 py-3 shadow-sm">
            <Text className="text-[15px] leading-5 text-white">{item.content}</Text>
          </View>
          <Text className="mt-1 text-[11px] text-zinc-500">{formatTime(item.created_at)}</Text>
        </View>
      );
    }

    return (
      <View className="mb-5 px-4">
        <View className="flex-row items-start">
          <Avatar
            imageUrl={item.user?.image_url ?? null}
            firstName={item.user?.first_name ?? null}
            lastName={item.user?.last_name ?? null}
            size={38}
          />

          <View className="ml-3 flex-1">
            <View className="mb-1 flex-row flex-wrap items-center">
              <Text className="text-[13px] font-semibold text-zinc-900">{displayName}</Text>
              <RoleBadge role={item.user?.role ?? null} />
            </View>

            <View className="max-w-[92%] self-start rounded-[22px] rounded-tl-md border border-zinc-200 bg-white px-4 py-3 shadow-sm">
              <Text className="text-[15px] leading-5 text-zinc-900">{item.content}</Text>
            </View>

            <Text className="mt-1 text-[11px] text-zinc-500">{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const content = (
    <View className="flex-1 bg-[#f8f8f8]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <View className="border-b border-zinc-200 bg-white px-4 pb-4 pt-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-zinc-950">Chat</Text>
              <Text className="mt-1 text-sm text-zinc-500">{schoolTitle}</Text>
            </View>

            <View className="h-11 w-11 items-center justify-center rounded-full bg-zinc-100">
              <Ionicons name="people" size={20} color="#111111" />
            </View>
          </View>
        </View>

        {!!error && (
          <View className="mx-4 mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-600">{error}</Text>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          className="flex-1"
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 18 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="px-6 pt-20">
              <View className="rounded-3xl border border-zinc-200 bg-white px-6 py-8">
                <Text className="text-center text-base font-semibold text-zinc-900">
                  No messages yet
                </Text>
                <Text className="mt-2 text-center text-sm leading-6 text-zinc-500">
                  Start the conversation with people from your school.
                </Text>
              </View>
            </View>
          }
        />

        <View className="border-t border-zinc-200 bg-white px-4 pb-24 pt-3">
          <View className="flex-row items-end">
            <View className="mr-3 flex-1 rounded-[28px] border border-zinc-200 bg-[#f6f6f6] px-4 py-3">
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message..."
                placeholderTextColor="#9ca3af"
                multiline
                className="max-h-32 text-[15px] leading-5 text-zinc-900"
              />
            </View>

            <TouchableOpacity
              onPress={handleSend}
              disabled={!message.trim() || sending}
              activeOpacity={0.8}
              className={`h-12 w-12 items-center justify-center rounded-full ${
                !message.trim() || sending ? "bg-zinc-300" : "bg-black"
              }`}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  if (loading) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-[#f8f8f8]">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#111111" />
            <Text className="mt-3 text-zinc-500">Loading school chat...</Text>
          </View>
        </SafeAreaView>
      </SwipeScreen>
    );
  }

  if (error && !chat) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-[#f8f8f8]">
          <View className="flex-1 px-6 pt-8">
            <Text className="text-2xl font-bold text-zinc-950">Chat</Text>

            <View className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5">
              <Text className="text-base font-semibold text-zinc-950">
                You are not in a school chat yet
              </Text>
              <Text className="mt-2 text-sm leading-6 text-zinc-500">{error}</Text>

              <TouchableOpacity
                onPress={bootstrap}
                activeOpacity={0.8}
                className="mt-5 rounded-2xl bg-black px-4 py-3"
              >
                <Text className="text-center font-semibold text-white">Reload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </SwipeScreen>
    );
  }

  return (
    <SwipeScreen>
      <SafeAreaView edges={["top"]} className="flex-1 bg-[#f8f8f8]">
        {content}
      </SafeAreaView>
    </SwipeScreen>
  );
}