import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

interface CenteredIconProps {
    name: string;
    size: number;
    color: string;
    containerStyle?: ViewStyle;
}

export const CenteredIcon: React.FC<CenteredIconProps> = ({
    name,
    size,
    color,
    containerStyle
}) => {
    return (
        <View style={[styles.container, containerStyle]}>
            <Icon
                name={name}
                size={size}
                color={color}
                style={styles.icon}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        textAlign: 'center',
        textAlignVertical: 'center',
    },
});
