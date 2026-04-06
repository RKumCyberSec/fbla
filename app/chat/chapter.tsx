import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useUser } from "@clerk/expo";

import SwipeScreen from "@/components/SwipeScreen";
import { supabase } from "@/lib/supabase";
import { formatDisplayName } from "@/lib/social";
import { displaySchoolName, normalizeSchoolName } from "@/lib/school";

type DbUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  school_name: string | null;
  role: string | null;
};

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    role: string | null;
    school_name: string | null;
  } | null;
};

function formatRoleLabel(role: string | null | undefined) {
  switch (role) {
    case "advisor":
      return "Advisor";
    case "chapter_officer":
      return "Officer";
    case "state_officer":
      return "State Officer";
    case "national_officer":
      return "National Officer";
    case "admin":
      return "Admin";
    default:
      return "Member";
  }
}

function roleBadgeColors(role: string | null | undefined) {
  switch (role) {
    case "advisor":
      return { bg: "#DBEAFE", text: "#1D4ED8" };
    case "chapter_officer":
      return { bg: "#DCFCE7", text: "#15803D" };
    case "state_officer":
    case "national_officer":
      return { bg: "#F3E8FF", text: "#7E22CE" };
    case "admin":
      return { bg: "#FEE2E2", text: "#B91C1C" };
    default:
      return { bg: "#F1F5F9", text: "#475569" };
  }
}

function formatMessageTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SchoolGroupChatScreen() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();

  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const listRef = useRef<FlatList<ChatMessage>>(null);

  const normalizedSchool = normalizeSchoolName(dbUser?.school_name);
  const schoolTitle = displaySchoolName(dbUser?.school_name) || "School Chat";

  const loadDbUser = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !user?.id) return null;

    const { data, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, image_url, school_name, role")
      .eq("clerk_user_id", user.id)
      .single();

    if (error) {
      console.error("loadDbUser error:", error);
      return null;
    }

    setDbUser(data as DbUser);
    return data as DbUser;
  }, [isLoaded, isSignedIn, user?.id]);

  const loadMessages = useCallback(async (school?: string) => {
    if (!school) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from("school_chat_messages")
      .select(`
        id,
        content,
        created_at,
        user_id,
        user:users!school_chat_messages_user_id_fkey (
          id,
          first_name,
          last_name,
          image_url,
          role,
          school_name
        )
      `)
      .eq("school_name", school)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("loadMessages error:", error);
      return;
    }

    setMessages((data || []) as ChatMessage[]);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      const current = await loadDbUser();
      await loadMessages(normalizeSchoolName(current?.school_name));
      setLoading(false);
    };

    bootstrap();
  }, [loadDbUser, loadMessages]);

  useEffect(() => {
    if (!normalizedSchool) return;

    const channel = supabase
      .channel(`school-chat-${normalizedSchool}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "school_chat_messages",
          filter: `school_name=eq.${normalizedSchool}`,
        },
        async () => {
          await loadMessages(normalizedSchool);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [normalizedSchool, loadMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !dbUser?.id || !normalizedSchool || sending) return;

    try {
      setSending(true);

      const { error } = await supabase.from("school_chat_messages").insert({
        school_name: normalizedSchool,
        user_id: dbUser.id,
        content: trimmed,
      });

      if (error) throw error;

      setMessageText("");
    } catch (error) {
      console.error("sendMessage error:", error);
    } finally {
      setSending(false);
    }
  };

  const canSend = !!messageText.trim() && !!normalizedSchool && !sending;

  if (!isLoaded || loading) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
            <Text className="mt-4 text-base text-slate-600">Loading chat...</Text>
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

  if (!normalizedSchool) {
    return (
      <SwipeScreen>
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="flex-1 items-center justify-center px-6">
            <Ionicons name="school-outline" size={42} color="#94A3B8" />
            <Text className="mt-4 text-xl font-bold text-slate-900">
              Add your school name
            </Text>
            <Text className="mt-2 text-center text-slate-500">
              Set your school name in your profile so we can place you in your school group chat.
            </Text>
          </View>
        </SafeAreaView>
      </SwipeScreen>
    );
  }

  return (
    <SwipeScreen>
      <SafeAreaView className="flex-1 bg-slate-50">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="px-5 pt-4 pb-3 bg-slate-50">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#0F172A" />
              </TouchableOpacity>

              <View className="flex-1 px-4">
                <Text className="text-center text-sm font-medium text-slate-500">
                  School Group Chat
                </Text>
                <Text
                  className="mt-1 text-center text-2xl font-bold text-slate-900"
                  numberOfLines={1}
                >
                  {schoolTitle}
                </Text>
              </View>

              <View style={{ width: 24 }} />
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 20,
              flexGrow: messages.length === 0 ? 1 : 0,
            }}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            renderItem={({ item }) => {
              const isOwnMessage = item.user_id === dbUser?.id;
              const badge = roleBadgeColors(item.user?.role);

              return (
                <View
                  style={{
                    flexDirection: isOwnMessage ? "row-reverse" : "row",
                    alignItems: "flex-end",
                  }}
                >
                  <Image
                    source={{
                      uri:
                        item.user?.image_url || "https://placehold.co/100x100/png",
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: "#E5E7EB",
                      marginHorizontal: 8,
                    }}
                  />

                  <View
                    style={{
                      maxWidth: "78%",
                      alignItems: isOwnMessage ? "flex-end" : "flex-start",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: 6,
                        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#0F172A",
                          marginRight: 6,
                        }}
                      >
                        {formatDisplayName(item.user || undefined)}
                      </Text>

                      <View
                        style={{
                          backgroundColor: badge.bg,
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          marginRight: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: badge.text,
                            fontSize: 11,
                            fontWeight: "700",
                          }}
                        >
                          {formatRoleLabel(item.user?.role)}
                        </Text>
                      </View>

                      <Text
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          marginTop: 1,
                        }}
                      >
                        {formatMessageTime(item.created_at)}
                      </Text>
                    </View>

                    <View
                      style={{
                        backgroundColor: isOwnMessage ? "#2563EB" : "white",
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: isOwnMessage ? "white" : "#0F172A",
                          fontSize: 15,
                          lineHeight: 20,
                        }}
                      >
                        {item.content}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-8">
                <Ionicons name="chatbubbles-outline" size={40} color="#94A3B8" />
                <Text className="mt-4 text-lg font-semibold text-slate-900">
                  School group chat
                </Text>
                <Text className="mt-2 text-center text-slate-500">
                  No messages yet. Start chatting with people from your school.
                </Text>
              </View>
            }
          />

          <View className="border-t border-slate-200 bg-white px-4 pt-3 pb-4">
            <View className="flex-row items-end">
              <View className="flex-1 rounded-[22px] bg-slate-100 px-4 py-3 mr-3">
                <TextInput
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Message your school..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  editable={!sending}
                  style={{
                    color: "#0F172A",
                    fontSize: 15,
                    maxHeight: 100,
                  }}
                />
              </View>

              <TouchableOpacity
                onPress={sendMessage}
                disabled={!canSend}
                activeOpacity={0.8}
                style={{
                  height: 44,
                  width: 44,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: canSend ? "#2563EB" : "#CBD5E1",
                }}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="send" size={18} color="white" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SwipeScreen>
  );
}