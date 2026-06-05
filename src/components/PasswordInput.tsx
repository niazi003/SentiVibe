import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { ICON_STYLE } from '../constants';

interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
    value: string;
    onChangeText: (text: string) => void;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
    value,
    onChangeText,
    placeholder,
    editable = true,
    style,
    ...rest
}) => {
    const [visible, setVisible] = useState(false);

    return (
        <View style={styles.wrapper}>
            <TextInput
                style={[styles.input, style]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#475569"
                secureTextEntry={!visible}
                editable={editable}
                autoCapitalize="none"
                autoCorrect={false}
                {...rest}
            />
            <TouchableOpacity
                style={styles.toggle}
                onPress={() => setVisible((prev) => !prev)}
                disabled={!editable}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Icon
                    name={visible ? 'eye-off' : 'eye'}
                    size={20}
                    color="#94A3B8"
                    style={ICON_STYLE}
                />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 12,
        padding: 16,
        paddingRight: 48,
        fontSize: 16,
        color: '#FFFFFF',
    },
    toggle: {
        position: 'absolute',
        right: 14,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
