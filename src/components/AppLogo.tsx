import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';

const LOGO_SOURCE = require('../images/logo.png');

type AppLogoSize = 'sm' | 'md' | 'lg';

interface AppLogoProps {
    size?: AppLogoSize;
    showGlow?: boolean;
    style?: ViewStyle;
}

const SIZES: Record<AppLogoSize, { container: number; image: number; glow: number }> = {
    sm: { container: 44, image: 40, glow: 44 },
    md: { container: 140, image: 112, glow: 140 },
    lg: { container: 160, image: 128, glow: 160 },
};

export const AppLogo: React.FC<AppLogoProps> = ({
    size = 'md',
    showGlow = true,
    style,
}) => {
    const dimensions = SIZES[size];

    return (
        <View
            style={[
                styles.container,
                {
                    width: dimensions.container,
                    height: dimensions.container,
                },
                style,
            ]}
        >
            {showGlow && (
                <View
                    style={[
                        styles.glow,
                        {
                            width: dimensions.glow,
                            height: dimensions.glow,
                            borderRadius: dimensions.glow / 2,
                        },
                    ]}
                />
            )}
            <Image
                source={LOGO_SOURCE}
                style={[
                    styles.image,
                    {
                        width: dimensions.image,
                        height: dimensions.image,
                        borderRadius: dimensions.image / 2,
                    },
                ]}
                resizeMode="cover"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    glow: {
        position: 'absolute',
        backgroundColor: '#2563EB',
        opacity: 0.25,
    },
    image: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
});
