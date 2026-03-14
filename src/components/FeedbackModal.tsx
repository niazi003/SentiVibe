import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { GlassCard } from './GlassCard';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFeedback: (type: 'positive' | 'negative') => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onFeedback }) => {
    if (!isOpen) return null;

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <GlassCard style={styles.card}>
                    <View style={styles.iconContainer}>
                        <Icon name="star" size={32} color="#FFFFFF" />
                    </View>

                    <Text style={styles.title}>Was this helpful?</Text>
                    <Text style={styles.subtitle}>Your feedback helps us improve recommendations.</Text>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.feedbackButton}
                            onPress={() => onFeedback('positive')}
                        >
                            <Icon name="thumbs-up" size={24} color="#94A3B8" />
                            <Text style={styles.feedbackButtonText}>Yes</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.feedbackButton}
                            onPress={() => onFeedback('negative')}
                        >
                            <Icon name="thumbs-down" size={24} color="#94A3B8" />
                            <Text style={styles.feedbackButtonText}>No</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity onPress={onClose}>
                        <Text style={styles.skipText}>Skip Feedback</Text>
                    </TouchableOpacity>
                </GlassCard>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    card: {
        width: '100%',
        maxWidth: 350,
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 32,
        textAlign: 'center',
        fontWeight: '300',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
        width: '100%',
    },
    feedbackButton: {
        flex: 1,
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        alignItems: 'center',
        gap: 8,
    },
    feedbackButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    skipText: {
        fontSize: 14,
        color: '#64748B',
    },
});
