import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { theme } from '../../theme/theme';

/**
 * VideoTutorialPlayer Component
 * 
 * Plays embedded video tutorials (60-90 seconds each)
 * Tracks viewing progress and marks tutorials as watched
 */

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.spacing.md,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 28,
    color: 'white',
  },
  metadata: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  duration: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  watchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  watchedText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: theme.spacing.sm,
    fontWeight: '600',
  },
});

export const VideoTutorialPlayer = ({
  videoId,
  title,
  description,
  duration = '90 seconds',
  thumbnailUrl,
  onWatched,
  watched = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isWatched, setIsWatched] = useState(watched);

  const handlePlay = () => {
    setIsLoading(true);
    // TODO: Open video player modal with embedded video
    // In production, integrate with react-native-video or similar
    setTimeout(() => {
      setIsLoading(false);
      setIsWatched(true);
      if (onWatched) onWatched(videoId);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={handlePlay}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} size="large" />
        ) : (
          <View style={styles.playButton}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.metadata}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <Text style={styles.duration}>⏱️ {duration}</Text>

        {isWatched && (
          <View style={styles.watchedBadge}>
            <Text style={{ fontSize: 16 }}>✓</Text>
            <Text style={styles.watchedText}>Watched</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default VideoTutorialPlayer;
