import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from './Button';
import { ICON_STYLE } from '../constants';
import { HELP_SUPPORT_SECTIONS } from '../constants/helpSupport';

interface HelpSupportModalProps {
    visible: boolean;
    onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();

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
                            <Text style={styles.title}>Help & Support</Text>
                            <Text style={styles.subtitle}>How to use Sentivibe and fix common issues</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="x" size={22} color="#94A3B8" style={ICON_STYLE} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator
                    >
                        {HELP_SUPPORT_SECTIONS.map((section) => (
                            <View key={section.title} style={styles.section}>
                                <Text style={styles.sectionTitle}>{section.title}</Text>
                                <Text style={styles.sectionBody}>{section.body}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <Button variant="primary" onPress={onClose} style={styles.doneButton}>
                        Got it
                    </Button>
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
    subtitle: {
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
    doneButton: {
        marginTop: 12,
    },
});
