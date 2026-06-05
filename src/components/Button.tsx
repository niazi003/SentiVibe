import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type ButtonVariant = 'primary' | 'secondary' | 'spotify' | 'outline' | 'ghost' | 'danger';

interface ButtonProps {
    children: React.ReactNode;
    onPress?: () => void;
    variant?: ButtonVariant;
    style?: ViewStyle;
    textStyle?: TextStyle;
    disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    onPress,
    variant = 'primary',
    style,
    textStyle,
    disabled = false,
}) => {
    const isDisabled = disabled;
    const getButtonStyles = () => {
        switch (variant) {
            case 'primary':
                return null; // Will use LinearGradient
            case 'secondary':
                return null; // Will use LinearGradient
            case 'spotify':
                return styles.spotifyButton;
            case 'outline':
                return styles.outlineButton;
            case 'ghost':
                return styles.ghostButton;
            case 'danger':
                return styles.dangerButton;
            default:
                return null;
        }
    };

    const getTextStyles = () => {
        switch (variant) {
            case 'spotify':
                return styles.spotifyText;
            case 'outline':
                return styles.outlineText;
            case 'ghost':
                return styles.ghostText;
            case 'danger':
                return styles.dangerText;
            default:
                return styles.primaryText;
        }
    };

    if (variant === 'primary') {
        if (isDisabled) {
            return (
                <View style={[styles.baseButton, styles.primaryDisabledButton, style]}>
                    <Text style={[styles.baseText, styles.primaryDisabledText, textStyle]}>
                        {children}
                    </Text>
                </View>
            );
        }

        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={style}
            >
                <LinearGradient
                    colors={['#2563EB', '#4F46E5']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.baseButton, styles.primaryButton]}
                >
                    <Text style={[styles.baseText, styles.primaryText, textStyle]}>{children}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    if (variant === 'secondary') {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={[style, isDisabled && styles.disabled]}
                disabled={isDisabled}
            >
                <LinearGradient
                    colors={['#38BDF8', '#3B82F6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.baseButton, styles.secondaryButton]}
                >
                    <Text style={[styles.baseText, styles.primaryText, textStyle]}>{children}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[styles.baseButton, getButtonStyles(), style, isDisabled && styles.disabled]}
            disabled={isDisabled}
        >
            <Text style={[styles.baseText, getTextStyles(), textStyle]}>{children}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    baseButton: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    baseText: {
        fontWeight: '700',
        fontSize: 16,
        textAlign: 'center',
    },
    primaryButton: {
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    primaryText: {
        color: '#FFFFFF',
    },
    primaryDisabledButton: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
    },
    primaryDisabledText: {
        color: '#64748B',
    },
    secondaryButton: {
        shadowColor: '#38BDF8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    spotifyButton: {
        backgroundColor: '#1DB954',
        shadowColor: '#1DB954',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    spotifyText: {
        color: '#000000',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'rgba(59, 130, 246, 0.5)',
    },
    outlineText: {
        color: '#60A5FA',
    },
    ghostButton: {
        backgroundColor: 'transparent',
    },
    ghostText: {
        color: '#94A3B8',
    },
    dangerButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.5)',
    },
    dangerText: {
        color: '#EF4444',
    },
    disabled: {
        opacity: 0.5,
    },
});
