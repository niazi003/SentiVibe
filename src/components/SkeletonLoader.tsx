/**
 * SkeletonLoader — Shimmer loading placeholder
 * 
 * Displays animated pulsing placeholders while data is loading.
 * Used in ResultsScreen to show loading state for track list.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

const SkeletonBlock: React.FC<SkeletonProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style,
}) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, []);

    return (
        <Animated.View
            style={[
                {
                    width: width as any,
                    height,
                    borderRadius,
                    backgroundColor: '#1E293B',
                    opacity,
                },
                style,
            ]}
        />
    );
};

/**
 * Track list skeleton — mimics the layout of the real track cards
 */
export const TrackListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
    return (
        <View style={styles.container}>
            {Array.from({ length: count }).map((_, idx) => (
                <View key={idx} style={styles.trackCard}>
                    {/* Album art placeholder */}
                    <SkeletonBlock width={64} height={64} borderRadius={12} />

                    {/* Track info */}
                    <View style={styles.trackInfo}>
                        <SkeletonBlock width="75%" height={16} />
                        <SkeletonBlock width="50%" height={14} style={{ marginTop: 8 }} />
                    </View>

                    {/* Play button placeholder */}
                    <SkeletonBlock width={40} height={40} borderRadius={20} />
                </View>
            ))}
        </View>
    );
};

/**
 * Generic inline skeleton for any content area
 */
export const InlineSkeleton: React.FC<SkeletonProps> = (props) => {
    return <SkeletonBlock {...props} />;
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        gap: 16,
    },
    trackCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 12,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    trackInfo: {
        flex: 1,
    },
});
