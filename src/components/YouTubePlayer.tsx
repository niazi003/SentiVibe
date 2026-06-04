/**
 * YouTubePlayer — Uses react-native-youtube-iframe
 *
 * PLAY/PAUSE FIX:
 * The library's `play` prop has timing issues with React 19.
 * We work around this by:
 * 1. Tracking ready state via onReady
 * 2. Using a playToggleCount to force the library's useEffect to detect changes
 * 3. On ready, ensuring initial play state is correct
 */

import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import YTPlayer from 'react-native-youtube-iframe';
import Icon from 'react-native-vector-icons/Feather';

interface YouTubePlayerProps {
  videoId: string;
  height?: number;
  autoplay?: boolean;
  isPlaying?: boolean;
  initialSeekSeconds?: number;
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
  initialSeekSeconds,
  onStateChange,
  onProgress,
  onError,
}, ref) => {
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isReadyRef = useRef(false);

  // ---- Play/pause fix ----
  // The library only calls playVideo/pauseVideo when the `play` prop CHANGES.
  // On initial mount with play=true, if the player isn't ready yet, the command is lost.
  // We track ready state and force-sync after ready.
  const [localPlay, setLocalPlay] = useState(isPlaying);

  // Keep localPlay in sync with isPlaying prop
  useEffect(() => {
    if (isReadyRef.current) {
      // Player is ready, directly update
      setLocalPlay(isPlaying);
    }
  }, [isPlaying]);

  // ---- Progress tracking ----
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
    }, 1000);
  }, [onProgress]);

  const stopProgressTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Expose seekTo to parent
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(seconds, true);
        if (onProgress) {
          playerRef.current.getDuration()
            .then((d: number) => onProgress(seconds, d))
            .catch(() => {});
        }
      }
    }
  }), [onProgress]);

  // Handle state changes from the YouTube player
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
    }
  }, [onStateChange, startProgressTracking, stopProgressTracking]);

  const handleError = useCallback(() => {
    setHasError(true);
    stopProgressTracking();
    onError?.();
  }, [onError, stopProgressTracking]);

  // When player becomes ready, sync the play state
  const handleReady = useCallback(() => {
    isReadyRef.current = true;
    setIsLoading(false);

    // Seek to handoff position from audio mode (if provided)
    if (initialSeekSeconds && initialSeekSeconds > 0 && playerRef.current) {
      playerRef.current.seekTo(initialSeekSeconds, true);
    }

    // Force the correct play state now that player is ready
    // Brief false→true toggle ensures the library's useEffect fires
    if (isPlaying) {
      setLocalPlay(false);
      setTimeout(() => setLocalPlay(true), 50);
    } else {
      setLocalPlay(false);
    }

    // Start progress tracking if playing
    if (isPlaying) {
      startProgressTracking();
    }
  }, [isPlaying, startProgressTracking, initialSeekSeconds]);

  // Reset when videoId changes
  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
    isReadyRef.current = false;
    stopProgressTracking();
  }, [videoId, stopProgressTracking]);

  // Sync progress tracking with play state
  useEffect(() => {
    if (isReadyRef.current) {
      if (isPlaying) {
        startProgressTracking();
      } else {
        stopProgressTracking();
      }
    }
  }, [isPlaying, startProgressTracking, stopProgressTracking]);

  // Cleanup
  useEffect(() => {
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
        play={localPlay}
        onChangeState={handleStateChange}
        onError={handleError}
        onReady={handleReady}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          onShouldStartLoadWithRequest: (request: any) => {
            const url = request.url || '';
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
              return false;
            }
            return true;
          },
        }}
        initialPlayerParams={{
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
