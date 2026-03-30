/**
 * YouTubePlayer — Upgraded to react-native-youtube-iframe
 * 
 * CRITICAL: This is the SINGLE global player instance.
 * It receives its state from PlayerContext and reports back
 * via onStateChange/onProgress callbacks.
 * 
 * Replaces the old WebView-based implementation for:
 * - Better playback control
 * - Progress tracking
 * - Synced audio/video mode
 */

import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import YTPlayer from 'react-native-youtube-iframe';
import Icon from 'react-native-vector-icons/Feather';

interface YouTubePlayerProps {
  videoId: string;
  height?: number;
  autoplay?: boolean;
  isPlaying?: boolean;
  onStateChange?: (state: string) => void;
  onProgress?: (currentTime: number, duration: number) => void;
  onError?: () => void;
}

export interface YouTubePlayerRef {
  seekTo: (seconds: number) => void;
}

export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(({
  videoId,
  height = 200,
  autoplay = false,
  isPlaying = true,
  onStateChange,
  onProgress,
  onError,
}, ref) => {
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Track playback progress by polling the player's current time
  const startProgressTracking = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      if (playerRef.current && onProgress) {
        try {
          const currentTime = await playerRef.current.getCurrentTime();
          const duration = await playerRef.current.getDuration();
          onProgress(currentTime, duration);
        } catch {}
      }
    }, 1000); // Poll every second
  }, [onProgress]);

  const stopProgressTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Expose methods to the parent via ref
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds, true);
        // Optimistically update progress to make UI feel snappier
        if (onProgress) {
          playerRef.current.getDuration().then((d: number) => onProgress(seconds, d)).catch(() => {});
        }
      }
    }
  }), [onProgress]);

  // Handle YouTube player state changes
  const handleStateChange = useCallback((state: string) => {
    onStateChange?.(state);

    switch (state) {
      case 'playing':
        setIsLoading(false);
        startProgressTracking();
        break;
      case 'paused':
      case 'ended':
        stopProgressTracking();
        break;
      case 'buffering':
        setIsLoading(true);
        break;
    }
  }, [onStateChange, startProgressTracking, stopProgressTracking]);

  const handleError = useCallback(() => {
    setHasError(true);
    stopProgressTracking();
    onError?.();
  }, [onError, stopProgressTracking]);

  const handleReady = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => stopProgressTracking();
  }, [stopProgressTracking]);

  if (hasError) {
    return (
      <View style={[styles.container, { height }, styles.errorContainer]}>
        <Icon name="play-circle" size={40} color="#EF4444" />
        <Text style={styles.errorText}>Video couldn't load</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setHasError(false)}
        >
          <Icon name="refresh-cw" size={16} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      )}
      <YTPlayer
        ref={playerRef}
        videoId={videoId}
        height={height}
        play={isPlaying}
        onChangeState={handleStateChange}
        onError={handleError}
        onReady={handleReady}
        webViewProps={{
          // Prevent navigation away from the player
          onShouldStartLoadWithRequest: (request: any) => {
            const url = request.url || '';
            // Block direct YouTube links that would open browser
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
              return false;
            }
            return true;
          },
          // Keep only essential webview props
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
        initialPlayerParams={{
          autoplay: autoplay ? 1 : 0,
          modestbranding: true,
          rel: false,
          preventFullScreen: false,
        }}
      />
    </View>
  );
});

/**
 * Helper: Extract YouTube video ID from a full URL.
 * Supports youtube.com/watch?v=, youtu.be/, and embed URLs.
 */
export const extractYouTubeId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
});
