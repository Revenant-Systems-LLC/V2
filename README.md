# V2

A tiny, always-on-top Windows companion orb for real-time voice conversation.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your Gemini Live credentials:

```env
LIVE_GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash-native-audio-preview-12-2025
GEMINI_LIVE_ENDPOINT=wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent
V_PROMPT_PATH=Prompts/V4.yaml
V_SAMPLE_RATE=16000
V_RESPONSE_VOICE=Leda
SPEECH_SENSITIVITY=END_SENSITIVITY_HIGH
ACTIVITY_DETECTION=true
```

3. Start the desktop app:

```bash
npm start
```

The orb can be dragged anywhere on-screen. Click the small toggle to start or stop voice capture.
