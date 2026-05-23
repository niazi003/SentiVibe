import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { AppProvider } from './src/context/AppContext';
import { PlayerProvider } from './src/context/PlayerContext';
import { SpotifyProvider } from './src/context/SpotifyContext';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#020617" />
      <AuthProvider>
        <AppProvider>
          <SpotifyProvider>
            {/* PlayerProvider wraps navigation so player state persists across screens */}
            <PlayerProvider>
              <NavigationContainer>
                <View style={styles.container}>
                  <AppNavigator />
                </View>
              </NavigationContainer>
            </PlayerProvider>
          </SpotifyProvider>
        </AppProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
});

export default App;
