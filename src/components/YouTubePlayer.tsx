import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Linking, ActivityIndicator } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';

interface YouTubePlayerProps {
  videoId: string;
  height?: number;
  autoplay?: boolean;
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  videoId,
  height = 200,
  autoplay = false
}) => {
  const playerHeight = height;
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);

  const youtubeAppUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const openInBrowser = () => {
    Linking.openURL(youtubeAppUrl);
  };

  // Custom HTML with YouTube IFrame API - prevents navigation away
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
            width: 100%; 
            height: 100%; 
            background: #000; 
            overflow: hidden;
        }
        #player {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }
        .play-button {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 68px;
            height: 48px;
            background: #FF0000;
            border-radius: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        .play-button::after {
            content: '';
            border-style: solid;
            border-width: 10px 0 10px 18px;
            border-color: transparent transparent transparent #fff;
            margin-left: 4px;
        }
        .thumbnail {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        #player-container {
            position: relative;
            width: 100%;
            height: 100%;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <div id="player-container">
        <img class="thumbnail" id="thumbnail" src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="Video thumbnail">
        <div class="play-button" id="play-btn"></div>
        <div id="player" style="display: none;"></div>
    </div>
    
    <script>
        var player;
        var isPlaying = false;
        
        // Load YouTube IFrame API
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        function onYouTubeIframeAPIReady() {
            // API is ready
        }
        
        function createPlayer() {
            document.getElementById('thumbnail').style.display = 'none';
            document.getElementById('play-btn').style.display = 'none';
            document.getElementById('player').style.display = 'block';
            
            player = new YT.Player('player', {
                videoId: '${videoId}',
                playerVars: {
                    'autoplay': 1,
                    'playsinline': 1,
                    'rel': 0,
                    'modestbranding': 1,
                    'controls': 1,
                    'fs': 1,
                    'origin': 'https://localhost'
                },
                events: {
                    'onReady': function(event) {
                        event.target.playVideo();
                    },
                    'onError': function(event) {
                        window.ReactNativeWebView.postMessage('error:' + event.data);
                    }
                }
            });
        }
        
        document.getElementById('play-btn').addEventListener('click', function() {
            createPlayer();
        });
        
        document.getElementById('thumbnail').addEventListener('click', function() {
            createPlayer();
        });
        
        ${autoplay ? 'setTimeout(createPlayer, 500);' : ''}
    </script>
</body>
</html>
    `;

  // Prevent navigation to external URLs - block YouTube app/website redirects
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    const url = navState.url || '';

    // Block YouTube app intents and watch URLs
    if (url.includes('youtube.com/watch') ||
      url.includes('youtu.be/') ||
      url.startsWith('intent://') ||
      url.startsWith('vnd.youtube://') ||
      url.includes('youtube.com/redirect')) {
      webViewRef.current?.stopLoading();
      webViewRef.current?.goBack();
      return false;
    }
    return true;
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    const url = request.url || '';

    // Block YouTube app intents and direct YouTube links
    if (url.includes('youtube.com/watch') ||
      url.includes('youtu.be/') ||
      url.startsWith('intent://') ||
      url.startsWith('vnd.youtube://') ||
      url.includes('youtube.com/redirect') ||
      url.includes('/channel/') ||
      url.includes('/user/')) {
      return false;
    }

    // Allow only essential YouTube resources
    if (url.includes('youtube.com/embed') ||
      url.includes('youtube.com/iframe_api') ||
      url.includes('youtube.com/s/player') ||
      url.includes('ytimg.com') ||
      url.includes('yt3.ggpht.com') ||
      url.startsWith('about:') ||
      url.startsWith('data:') ||
      url.includes('googlevideo.com') ||
      url.includes('googleusercontent.com') ||
      url.includes('gstatic.com') ||
      url.includes('googleapis.com')) {
      return true;
    }

    // Block everything else
    return false;
  };

  if (hasError) {
    return (
      <View style={[styles.container, { height: playerHeight }, styles.errorContainer]}>
        <Icon name="play-circle" size={40} color="#EF4444" />
        <Text style={styles.errorText}>Video couldn't load</Text>
        <TouchableOpacity style={styles.openButton} onPress={openInBrowser}>
          <Icon name="external-link" size={16} color="#FFFFFF" />
          <Text style={styles.openButtonText}>Open in YouTube</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: playerHeight }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent, baseUrl: 'https://localhost' }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        mediaPlaybackRequiresUserAction={false}
        scrollEnabled={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        originWhitelist={['*']}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => setHasError(true)}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={(event) => {
          if (event.nativeEvent.data.startsWith('error:')) {
            setHasError(true);
          }
        }}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
      />
      {/* Quick access button to open in YouTube app */}
      <TouchableOpacity style={styles.youtubeButton} onPress={openInBrowser}>
        <Icon name="external-link" size={14} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

// Helper function to extract YouTube video ID from URL
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
  webview: {
    flex: 1,
    backgroundColor: '#000',
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
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  openButtonText: {
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
  youtubeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
