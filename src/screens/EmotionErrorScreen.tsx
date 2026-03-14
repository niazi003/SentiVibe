import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from '../components';
import { NavigationProp } from '../types';
import { ICON_STYLE } from '../constants';

export const EmotionErrorScreen: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.iconContainer}>
                <Icon name="alert-circle" size={48} color="#EF4444" style={ICON_STYLE} />
            </View>

            <Text style={styles.title}>Oops!</Text>
            <Text style={styles.description}>
                We couldn't detect your emotion clearly. Please try again with better lighting or clearer audio.
            </Text>

            <Button
                onPress={() => navigation.navigate('Chatbot', { reset: true })}
                style={styles.button}
            >
                <Icon name="rotate-ccw" size={18} color="#FFFFFF" /> Try Again
            </Button>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    button: {
        width: '100%',
    },
});
