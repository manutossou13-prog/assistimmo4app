---
name: transcription_audio
description: Transcrit un fichier audio en texte (avec timestamps, et idéalement diarization), pour exploitation par compte_rendu_visite.
agents: [lea]
inputs: [audio_file, language?, speakers_count?]
outputs: [transcript, segments_with_timestamps]
---

# Skill — transcription_audio

## Backends
- **OpenAI Whisper** API (par défaut)
- **Deepgram** (qualité + diarization, V2)

## Limites
- Fichier ≤ 60 min (chunking V2).
- FR par défaut, multilingue auto-detect.
- Audio bruit fort → qualité dégradée signalée.

## Sécurité & RGPD
- L'utilisateur **doit cocher** "j'ai le consentement" avant upload.
- Audio supprimé du stockage 30j après transcription (configurable).
- Transcription chiffrée au repos.

## Output
```json
{
  "transcript": "...",
  "segments": [
    { "start": 0.0, "end": 3.4, "speaker": "S1", "text": "..." }
  ],
  "language": "fr",
  "duration_sec": 1620
}
```
