export interface PrivacyPolicySection {
    title: string;
    body: string;
}

export const PRIVACY_POLICY_LAST_UPDATED = 'June 5, 2026';

export const PRIVACY_POLICY_SECTIONS: PrivacyPolicySection[] = [
    {
        title: 'Introduction',
        body:
            'Welcome to Sentivibe. We built Sentivibe to help you discover music and movies that match how you feel. ' +
            'This Privacy Policy explains what information we collect, how we use it, how we protect it, and the choices you have. ' +
            'By creating an account, you agree to the practices described here.',
    },
    {
        title: 'Information We Collect',
        body:
            'Account information: When you sign up, we collect your name, email address, and password. Your password is stored securely by Firebase Authentication and is never stored in plain text.\n\n' +
            'Mood and chat data: When you use the chatbot, we process the messages you send to detect your mood and provide personalized recommendations. Mood history may be saved to your account.\n\n' +
            'Preferences: During onboarding and in settings, you may share favorite genres, music tastes, and other personalization choices. These are stored with your profile.\n\n' +
            'Favorites: Movies or media you save as favorites are linked to your account.\n\n' +
            'Usage data: We may collect basic technical information such as app version and interaction patterns to improve reliability and performance.',
    },
    {
        title: 'Camera, Photos & Voice',
        body:
            'Sentivibe may ask to use your camera, photos, or microphone only to analyze your mood in the moment and improve recommendations.\n\n' +
            'We do not save, store, or upload your pictures or voice recordings to our servers. Any image or audio you provide is processed temporarily for mood detection and is discarded immediately afterward. We do not keep copies on our system.\n\n' +
            'You can decline camera, photo, or microphone access at any time in your device settings. Mood detection features that rely on these inputs will not work without permission, but the rest of the app will still function.',
    },
    {
        title: 'How We Use Your Information',
        body:
            'We use your information to:\n\n' +
            '• Create and manage your account\n' +
            '• Detect mood from your conversations and suggest relevant music and movies\n' +
            '• Save your preferences, favorites, and mood history across devices\n' +
            '• Sync personalization data with our backend services when needed for recommendations\n' +
            '• Improve app features, fix bugs, and maintain security\n\n' +
            'We do not sell your personal information to third parties.',
    },
    {
        title: 'Third-Party Services',
        body:
            'Sentivibe uses trusted third-party services to operate:\n\n' +
            '• Firebase (Google): Authentication and cloud database (Firestore) for account and profile data\n' +
            '• Spotify: Optional music integration and recommendations when you connect or use music features\n' +
            '• Movie and media APIs: To fetch titles, metadata, trailers, and related content for recommendations\n\n' +
            'These providers process data according to their own privacy policies. We only share the minimum information required for each service to function.',
    },
    {
        title: 'Data Storage & Security',
        body:
            'Your account and profile data are stored in Firebase Firestore, protected by industry-standard security practices including encrypted connections (HTTPS/TLS) and access controls tied to your authenticated account.\n\n' +
            'While we take reasonable steps to protect your data, no method of transmission or storage is completely secure. Please use a strong, unique password and keep your login credentials private.',
    },
    {
        title: 'Data Retention',
        body:
            'We retain your account information, preferences, mood history, and favorites for as long as your account is active. If you delete your account or request deletion, we will remove or anonymize your personal data within a reasonable timeframe, except where retention is required by law.',
    },
    {
        title: 'Your Rights & Choices',
        body:
            'You can:\n\n' +
            '• Update your personalization preferences in Settings\n' +
            '• Review your mood history within the app\n' +
            '• Log out at any time from your device\n' +
            '• Contact us to request access, correction, or deletion of your personal data\n\n' +
            'Depending on your location, you may have additional rights under applicable privacy laws.',
    },
    {
        title: 'Children\'s Privacy',
        body:
            'Sentivibe is not intended for children under 13 (or the minimum age required in your region). We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can remove it.',
    },
    {
        title: 'Changes to This Policy',
        body:
            'We may update this Privacy Policy from time to time. When we make material changes, we will update the "Last updated" date and may notify you through the app. Continued use of Sentivibe after changes take effect means you accept the revised policy.',
    },
    {
        title: 'Contact Us',
        body:
            'If you have questions about this Privacy Policy or how your data is handled, contact us at:\n\n' +
            'Email: privacy@sentivibe.app\n\n' +
            'We will respond to privacy-related requests as promptly as possible.',
    },
];
