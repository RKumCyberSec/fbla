import { useMemo, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "@/lib/supabase";
import { uploadImageToSupabase } from "@/lib/social";

type Props = {
  visible: boolean;
  onClose: () => void;
  refresh: () => Promise<void> | void;
  currentDbUserId: string | null;
};

const SUGGESTED_HASHTAGS = [
  "fyp",
  "explore",
  "photo",
  "daily",
  "vibes",
  "life",
  "friends",
  "love",
  "summer",
  "mood",
  "aesthetic",
  "travel",
];

function normalizeTag(tag: string) {
  return tag.replace(/^#+/, "").trim().toLowerCase();
}

function extractHashtags(text: string) {
  const matches = text.match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => normalizeTag(tag)))];
}

export default function CreatePostModal({
  visible,
  onClose,
  refresh,
  currentDbUserId,
}: Props) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);

  const hashtags = useMemo(() => extractHashtags(content), [content]);
  const canShare = !!(content.trim() || images.length > 0) && !posting;

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
      exif: false,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
      setImages(uris);
    }
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((img) => img !== uri));
  };

  const addHashtag = (tag: string) => {
    const normalized = normalizeTag(tag);
    if (!normalized) return;

    const existing = extractHashtags(content);
    if (existing.includes(normalized)) return;

    const spacer = content.trim().length > 0 ? " " : "";
    setContent((prev) => `${prev.trimEnd()}${spacer}#${normalized}`);
  };

  const removeHashtag = (tag: string) => {
    const regex = new RegExp(`(^|\\s)#${tag}(?=\\s|$)`, "gi");
    const updated = content.replace(regex, " ").replace(/\s+/g, " ").trim();
    setContent(updated);
  };

  const createPost = async () => {
    if (!currentDbUserId || posting) return;
    if (!content.trim() && images.length === 0) return;

    try {
      setPosting(true);

      let uploadedUrls: string[] = [];

      if (images.length > 0) {
        uploadedUrls = await Promise.all(
          images.map((uri) => uploadImageToSupabase(uri, currentDbUserId))
        );
      }

      const { error } = await supabase.from("posts").insert({
        author_id: currentDbUserId,
        content: content.trim() || "",
        media_url: uploadedUrls.length ? JSON.stringify(uploadedUrls) : null,
        media_type: uploadedUrls.length ? "image" : null,
        post_type: "social",
        visibility: "public",
      });

      if (error) {
        console.error("createPost error:", error);
        setPosting(false);
        return;
      }

      setContent("");
      setImages([]);
      await refresh();
      onClose();
    } catch (error) {
      console.error("createPost unexpected error:", error);
    } finally {
      setPosting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        className="flex-1 bg-white"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="px-4 pt-14 pb-3 border-b border-gray-200 flex-row items-center justify-between bg-white">
          <TouchableOpacity onPress={onClose} className="px-1 py-1">
            <Text className="text-red-500 text-base font-medium">Cancel</Text>
          </TouchableOpacity>

          <Text className="text-lg font-bold text-black">Create post</Text>

          <TouchableOpacity
            onPress={createPost}
            disabled={!canShare}
            className={`px-4 py-2 rounded-full ${
              canShare ? "bg-blue-500" : "bg-gray-200"
            }`}
          >
            <Text
              className={`font-semibold ${
                canShare ? "text-white" : "text-gray-500"
              }`}
            >
              {posting ? "Posting..." : "Share"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Caption Card */}
          <View className="px-4 pt-4">
            <View className="bg-gray-50 border border-gray-200 rounded-3xl p-4">
              <Text className="text-xs font-semibold tracking-wide text-gray-500 uppercase mb-3">
                Caption
              </Text>

              <TextInput
                placeholder="Write a caption..."
                placeholderTextColor="#9CA3AF"
                value={content}
                onChangeText={setContent}
                multiline
                textAlignVertical="top"
                className="min-h-[140px] text-[16px] leading-6 text-black"
              />

              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-gray-400 text-sm">
                  {content.length}/2200
                </Text>
                <Text className="text-gray-400 text-sm">
                  {hashtags.length} hashtag{hashtags.length === 1 ? "" : "s"}
                </Text>
              </View>
            </View>
          </View>

          {/* Selected hashtags */}
          {hashtags.length > 0 && (
            <View className="px-4 pt-4">
              <Text className="text-sm font-semibold text-black mb-3">
                Hashtags
              </Text>

              <View className="flex-row flex-wrap">
                {hashtags.map((tag) => (
                  <View
                    key={tag}
                    className="mr-2 mb-2 flex-row items-center bg-blue-50 border border-blue-200 rounded-full pl-3 pr-2 py-2"
                  >
                    <Text className="text-blue-600 font-medium mr-2">
                      #{tag}
                    </Text>
                    <TouchableOpacity onPress={() => removeHashtag(tag)}>
                      <Ionicons name="close-circle" size={18} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Suggested hashtags */}
          <View className="px-4 pt-4">
            <Text className="text-sm font-semibold text-black mb-3">
              Suggested hashtags
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {SUGGESTED_HASHTAGS.map((tag) => {
                const exists = hashtags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => addHashtag(tag)}
                    disabled={exists}
                    className={`mr-2 rounded-full border px-4 py-2 ${
                      exists
                        ? "bg-gray-100 border-gray-200"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        exists ? "text-gray-400" : "text-black"
                      }`}
                    >
                      #{tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Add Photos Button */}
          <View className="px-4 pt-5">
            <TouchableOpacity
              onPress={pickImages}
              className="bg-black rounded-2xl px-4 py-4 flex-row items-center justify-center"
            >
              <Ionicons name="images-outline" size={22} color="white" />
              <Text className="ml-2 font-semibold text-white">
                {images.length > 0 ? "Add more photos" : "Select photos"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview Header */}
          <View className="px-4 pt-5 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-black">Preview</Text>
            <Text className="text-sm text-gray-500">
              {images.length} photo{images.length === 1 ? "" : "s"} selected
            </Text>
          </View>

          {/* Image Preview */}
          {images.length > 0 ? (
            <View className="px-4 pt-3">
              {/* Main preview */}
              <View className="rounded-3xl overflow-hidden bg-gray-100 border border-gray-200">
                <Image
                  source={{ uri: images[0] }}
                  className="w-full h-80"
                  resizeMode="cover"
                />

                <View className="absolute top-3 right-3 bg-black/70 rounded-full px-3 py-1">
                  <Text className="text-white text-xs font-semibold">
                    1 / {images.length}
                  </Text>
                </View>
              </View>

              {/* Thumbnail strip */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-4"
              >
                {images.map((uri, index) => (
                  <View key={uri} className="mr-3 relative">
                    <Image
                      source={{ uri }}
                      className="w-24 h-24 rounded-2xl"
                      resizeMode="cover"
                    />

                    <View className="absolute left-2 top-2 bg-black/70 rounded-full px-2 py-0.5">
                      <Text className="text-white text-[10px] font-semibold">
                        {index + 1}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => removeImage(uri)}
                      className="absolute top-2 right-2 bg-black/75 rounded-full p-1"
                    >
                      <Ionicons name="close" size={14} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <View className="px-4 pt-3">
              <View className="bg-gray-50 border border-dashed border-gray-300 rounded-3xl h-52 items-center justify-center">
                <Ionicons name="image-outline" size={34} color="#9CA3AF" />
                <Text className="mt-3 text-gray-500 font-medium">
                  No photos selected yet
                </Text>
                <Text className="mt-1 text-gray-400 text-sm">
                  Add images to preview your post
                </Text>
              </View>
            </View>
          )}

          {/* Bottom tips */}
          <View className="px-4 pt-6">
            <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <Text className="text-blue-700 font-semibold mb-1">
                Post tips
              </Text>
              <Text className="text-blue-600 text-sm leading-5">
                Use a strong first image, keep captions short, and add a few
                relevant hashtags to help people discover your post.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}