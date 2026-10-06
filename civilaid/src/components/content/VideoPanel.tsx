import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/ui';
import { getVideoUrl } from '@/lib/content';
import { VIDEO_WATCHED_RATIO } from '@/lib/progress';
import { radius, useTheme } from '@/theme/ThemeProvider';

type Props = { path: string; onWatched: () => void };

/** Streams a module video from a short-lived signed link. There is no download option. */
export function VideoPanel({ path, onWatched }: Props) {
  const { colors } = useTheme();
  const [link, setLink] = useState<{ path: string; url?: string; error?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVideoUrl(path).then(
      (url) => !cancelled && setLink({ path, url }),
      (e: Error) => !cancelled && setLink({ path, error: e.message }),
    );
    return () => {
      cancelled = true;
    };
  }, [path]);

  const current = link?.path === path ? link : null;
  if (current?.error) return <Banner message={`Couldn’t load the video: ${current.error}`} />;
  if (!current?.url) {
    return (
      <View style={[styles.frame, styles.center, { backgroundColor: colors.surfaceMuted }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  return <Player url={current.url} onWatched={onWatched} />;
}

function Player({ url, onWatched }: { url: string; onWatched: () => void }) {
  const player = useVideoPlayer(url, (p) => {
    p.timeUpdateEventInterval = 1;
  });
  const reported = useRef(false);

  const report = () => {
    if (reported.current) return;
    reported.current = true;
    onWatched();
  };
  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (player.duration > 0 && currentTime / player.duration >= VIDEO_WATCHED_RATIO) report();
  });
  useEventListener(player, 'playToEnd', report);

  return (
    <View style={[styles.frame, styles.black]}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        nativeControls
        contentFit="contain"
        allowsPictureInPicture={false}
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: 'hidden' },
  black: { backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
