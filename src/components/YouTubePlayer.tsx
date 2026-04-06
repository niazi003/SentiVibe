/**
 * YouTubePlayer — Embed URL + Referer Header approach
 *
 * Uses youtube-nocookie.com/embed/{videoId} directly (NOT local HTML + IFrame API)
 * with a Referer header matching the app bundle ID.
 * This is the proven fix for YouTube Error 153 in React Native WebViews.
 *
 * Play/pause/seek controlled via injectJavaScript → YouTube postMessage API.
 * Progress reported via JS polling → window.ReactNativeWebView.postMessage.
 */

import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useCallback,
  useState,
  useEffect,
} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';

const APP_BUNDLE_ID = 'com.sentivibe';

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

/**
 * Build embed URL with parameters
 */
const buildEmbedUrl = (videoId: string, autoplay: boolean) => {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    controls: '0',
    modestbranding: '1',
    rel: '0',
    showinfo: '0',
    playsinline: '1',
    enablejsapi: '1',
    origin: `https://${APP_BUNDLE_ID}`,
    widget_referrer: `https://${APP_BUNDLE_ID}`,
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

/**
 * JavaScript injected after the embed page loads.
 * Sets up:
 * - Message listener to receive commands from React Native
 * - Progress polling that reports currentTime/duration back to RN
 * - Hooks into the YouTube player's postMessage state events
 */
const INJECTED_JS = `
(function() {
  var progressInterval = null;
  var playerReady = false;
  var iframe = document.querySelector('iframe') || document.querySelector('video');

  // Listen for YouTube player state messages (YouTube IFrame uses postMessage)
  window.addEventListener('message', function(event) {
    try {
      var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data.event === 'onStateChange') {
        var stateMap = {'-1':'unstarted','0':'ended','1':'playing','2':'paused','3':'buffering','5':'cued'};
        var state = stateMap[String(data.info)] || 'unknown';
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'stateChange',state:state}));
        if (data.info === 1) { startProg(); }
        else if (data.info === 0 || data.info === 2) { stopProg(); }
      }
      if (data.event === 'onReady') {
        playerReady = true;
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
        startProg();
      }
      if (data.event === 'onError') {
        window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',code:data.info}));
      }
      if (data.event === 'infoDelivery' && data.info) {
        if (typeof data.info.currentTime === 'number') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type:'progress',
            currentTime: data.info.currentTime,
            duration: data.info.duration || 0
          }));
        }
      }
    } catch(e) {}
  });

  // Send commands to the YouTube iframe
  function postCmd(event, args) {
    var target = document.querySelector('iframe');
    if (target && target.contentWindow) {
      target.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: event,
        args: args || []
      }), '*');
    }
  }

  // Exposed globally so injectJavaScript can call them
  window.playVideo = function() { postCmd('playVideo'); };
  window.pauseVideo = function() { postCmd('pauseVideo'); };
  window.seekTo = function(s) { postCmd('seekTo', [s, true]); };

  // Also request event listening from the iframe
  function listenToPlayer() {
    var target = document.querySelector('iframe');
    if (target && target.contentWindow) {
      target.contentWindow.postMessage(JSON.stringify({
        event: 'listening',
        id: 1
      }), '*');
    }
  }

  // Fallback progress polling using postMessage API
  function startProg() {
    stopProg();
    progressInterval = setInterval(function() {
      postCmd('getVideoData');
      // The infoDelivery messages from YouTube will provide currentTime
    }, 800);
  }
  function stopProg() {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
  }

  // Signal that we're listening — retry a few times to ensure connection
  var listenAttempts = 0;
  var listenTimer = setInterval(function() {
    listenToPlayer();
    listenAttempts++;
    if (listenAttempts > 10) clearInterval(listenTimer);
  }, 500);

  // Notify RN that injection is done
  window.ReactNativeWebView.postMessage(JSON.stringify({type:'injected'}));
})();
true;
`;

// ---------- Component ----------
export const YouTubePlayer = forwardRef<YouTubePlayerRef, YouTubePlayerProps>(
  (
    {
      videoId,
      height = 200,
      autoplay = false,
      isPlaying = true,
      onStateChange,
      onProgress,
      onError,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isReadyRef = useRef(false);
    const isPlayingRef = useRef(isPlaying);

    useEffect(() => {
      isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Expose seekTo to parent
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        webViewRef.current?.injectJavaScript(`seekTo(${seconds}); true;`);
      },
    }), []);

    // Sync play/pause state via injectJavaScript
    useEffect(() => {
      if (!isReadyRef.current) return;
      if (isPlaying) {
        webViewRef.current?.injectJavaScript('playVideo(); true;');
      } else {
        webViewRef.current?.injectJavaScript('pauseVideo(); true;');
      }
    }, [isPlaying]);

    // Reset on videoId change
    useEffect(() => {
      setIsLoading(true);
      setHasError(false);
      isReadyRef.current = false;
    }, [videoId]);

    const handleMessage = useCallback(
      (event: any) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          switch (data.type) {
            case 'injected':
              // JS injected successfully
              break;
            case 'ready':
              isReadyRef.current = true;
              setIsLoading(false);
              if (isPlayingRef.current) {
                webViewRef.current?.injectJavaScript('playVideo(); true;');
              }
              break;
            case 'stateChange':
              onStateChange?.(data.state);
              if (data.state === 'playing') {
                setIsLoading(false);
              }
              break;
            case 'progress':
              onProgress?.(data.currentTime, data.duration);
              break;
            case 'error':
              setHasError(true);
              onError?.();
              break;
          }
        } catch { }
      },
      [onStateChange, onProgress, onError],
    );

    if (hasError) {
      return (
        <View style={[styles.container, { height }, styles.errorContainer]}>
          <Icon name="play-circle" size={40} color="#EF4444" />
          <Text style={styles.errorText}>Video couldn't load</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              setIsLoading(true);
              isReadyRef.current = false;
            }}>
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
        <WebView
          key={videoId}
          ref={webViewRef}
          source={{
            uri: buildEmbedUrl(videoId, autoplay),
            headers: {
              Referer: `https://${APP_BUNDLE_ID}`,
            },
          }}
          style={{ height, backgroundColor: '#000' }}
          onMessage={handleMessage}
          injectedJavaScript={INJECTED_JS}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          scrollEnabled={false}
          bounces={false}
          originWhitelist={['*']}
          allowsFullscreenVideo={false}
          onShouldStartLoadWithRequest={request => {
            const url = request.url || '';
            if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
              return false;
            }
            return true;
          }}
          onError={() => {
            setHasError(true);
            onError?.();
          }}
        />
      </View>
    );
  },
);

/**
 * Helper: Extract YouTube video ID from a full URL.
 */
export const extractYouTubeId = (url: string): string | null => {
  const regExp =
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7].length === 11 ? match[7] : null;
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
