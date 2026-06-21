export interface HelpSupportSection {
    title: string;
    body: string;
}

export const HELP_SUPPORT_SECTIONS: HelpSupportSection[] = [
    {
        title: 'Getting Started',
        body:
            'Welcome to Sentivibe! After signing up, complete the onboarding wizard to set your music and movie preferences.\n\n' +
            'From the home screen, open the AI chatbot to tell the app how you feel. You can type a message, use your voice, or scan your face with the camera.\n\n' +
            'Once your mood is detected, browse personalized music, music videos, and movie recommendations matched to how you feel.',
    },
    {
        title: 'How to Run the App',
        body:
            'Make sure you are signed in and connected to the internet before using Sentivibe.\n\n' +
            '1. Open the chatbot and share your mood through text, voice, or camera.\n' +
            '2. Wait for mood detection to finish — you will see your detected emotion on screen.\n' +
            '3. Tap Music, Videos, or Movies to view recommendations for that mood.\n' +
            '4. Connect Spotify in Settings to play full tracks and sync your music tastes.\n' +
            '5. Update Personalization Settings anytime to refine your recommendations.',
    },
    {
        title: 'Spotify Connection',
        body:
            'Go to Settings and tap Connect Spotify. You will be redirected to Spotify to authorize Sentivibe.\n\n' +
            'If connection fails, make sure the Spotify app is installed, you are logged into Spotify, and you have a stable internet connection. Tap Connected — Tap to Disconnect to reset and try again.',
    },
    {
        title: 'Mood Detection Issues',
        body:
            'Text chat: Type a clear message describing how you feel and send it to the chatbot.\n\n' +
            'Voice: Grant microphone permission when prompted. Speak clearly for a few seconds in a quiet environment.\n\n' +
            'Camera: Grant camera permission when prompted. Face the camera in good lighting with your face clearly visible.\n\n' +
            'If detection keeps failing, try a different input method or restart the app.',
    },
    {
        title: 'No Recommendations or Slow Responses',
        body:
            'Recommendations depend on mood detection and your saved preferences. Make sure onboarding is complete and a mood has been detected before opening Music, Videos, or Movies.\n\n' +
            'If the chatbot is slow or unresponsive, check your internet connection and wait a moment — AI responses can take a few seconds. Pull down to refresh or restart the app if the issue persists.',
    },
    {
        title: 'Permissions & Privacy',
        body:
            'Sentivibe may request camera, microphone, and photo access only for mood detection. Images and voice recordings are processed temporarily and are not stored on our servers.\n\n' +
            'You can revoke permissions anytime in your device Settings. Text chat and browsing will still work without camera or microphone access.',
    },
    {
        title: 'Still Need Help?',
        body:
            'Try logging out and signing back in from Settings. If problems continue, make sure you are on the latest app version and contact your administrator or development team with your app version and a short description of the issue.',
    },
];
