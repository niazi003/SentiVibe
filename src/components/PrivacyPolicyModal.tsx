import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    NativeSyntheticEvent,
    NativeScrollEvent,
    LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from './Button';
import { ICON_STYLE } from '../constants';
import {
    PRIVACY_POLICY_LAST_UPDATED,
    PRIVACY_POLICY_SECTIONS,
} from '../constants/privacyPolicy';

interface PrivacyPolicyModalProps {
    visible: boolean;
    onClose: () => void;
    onAccept: () => void;
}

const SCROLL_THRESHOLD = 48;

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
    visible,
    onClose,
    onAccept,
}) => {
    const insets = useSafeAreaInsets();
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const [scrollViewHeight, setScrollViewHeight] = useState(0);
    const [contentHeight, setContentHeight] = useState(0);

    const resetScrollState = useCallback(() => {
        setHasScrolledToBottom(false);
        setScrollViewHeight(0);
        setContentHeight(0);
    }, []);

    useEffect(() => {
        if (visible) {
            resetScrollState();
        }
    }, [visible, resetScrollState]);

    useEffect(() => {
        if (contentHeight > 0 && scrollViewHeight > 0 && contentHeight <= scrollViewHeight) {
            setHasScrolledToBottom(true);
        }
    }, [contentHeight, scrollViewHeight]);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isAtBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - SCROLL_THRESHOLD;

        if (isAtBottom) {
            setHasScrolledToBottom(true);
        }
    };

    const handleAccept = () => {
        if (!hasScrolledToBottom) return;
        onAccept();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
                    <View style={styles.header}>
                        <View style={styles.headerText}>
                            <Text style={styles.title}>Privacy Policy</Text>
                            <Text style={styles.updated}>Last updated: {PRIVACY_POLICY_LAST_UPDATED}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="x" size={22} color="#94A3B8" style={ICON_STYLE} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        onLayout={(event: LayoutChangeEvent) => {
                            setScrollViewHeight(event.nativeEvent.layout.height);
                        }}
                        onContentSizeChange={(_width, height) => {
                            setContentHeight(height);
                        }}
                    >
                        {PRIVACY_POLICY_SECTIONS.map((section) => (
                            <View key={section.title} style={styles.section}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                <Text style={styles.sectionBody}>{section.body}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    {!hasScrolledToBottom && (
                        <Text style={styles.scrollHint}>
                            Scroll to the bottom to enable Accept
                        </Text>
                    )}

                    <View style={styles.actions}>
                        <Button variant="ghost" onPress={onClose} style={styles.cancelButton}>
                            Cancel
                        </Button>
                        <TouchableOpacity
                            onPress={handleAccept}
                            activeOpacity={hasScrolledToBottom ? 0.8 : 1}
                            disabled={!hasScrolledToBottom}
                            style={[
                                styles.acceptButton,
                                !hasScrolledToBottom && styles.acceptButtonDisabled,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.acceptButtonText,
                                    !hasScrolledToBottom && styles.acceptButtonTextDisabled,
                                ]}
                            >
                                Accept
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: '#020617',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2, 6, 23, 0.96)',
    },
    sheet: {
        maxHeight: '88%',
        backgroundColor: '#0F172A',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderWidth: 1,
        borderColor: '#334155',
        borderBottomWidth: 0,
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    updated: {
        fontSize: 12,
        color: '#64748B',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
    },
    scrollView: {
        maxHeight: 420,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#E2E8F0',
        marginBottom: 8,
    },
    sectionBody: {
        fontSize: 14,
        lineHeight: 22,
        color: '#CBD5E1',
    },
    scrollHint: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
    },
    cancelButton: {
        flex: 1,
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#2563EB',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptButtonDisabled: {
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
    },
    acceptButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    acceptButtonTextDisabled: {
        color: '#64748B',
    },
});
