import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

type Props = {
  musicUrl: string;
  title?: string | null;
  artist?: string | null;
};

export default function MusicPreview({
  musicUrl,
  title,
  artist,
}: Props) {
  const player = useAudioPlayer(musicUrl, {
    updateInterval: 500,
  });
  const status = useAudioPlayerStatus(player);

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    if (
      typeof status.duration === "number" &&
      typeof status.currentTime === "number" &&
      status.duration > 0 &&
      status.currentTime >= status.duration
    ) {
      player.seekTo(0);
    }

    player.play();
  };

  return (
    <TouchableOpacity onPress={togglePlayback} className="px-4 pt-2">
      <View className="bg-gray-100 rounded-full px-3 py-2 flex-row items-center self-start">
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={16}
          color="black"
        />
        <Text className="ml-2 text-black font-medium">
          ♪ {title || "Audio"}
          {artist ? ` — ${artist}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );
}