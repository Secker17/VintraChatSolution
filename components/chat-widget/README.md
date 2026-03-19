# Chat Widget Components

Dette er en modulær struktur for VintraChat widgeten, delt inn i separate, lett-redigerbare komponenter.

## Struktur

```
chat-widget/
├── index.tsx          # Hovedkomponent som kombinerer alt
├── chat-header.tsx     # Topptekst/header-delen
├── chat-main.tsx       # Hovedinnhold (chat, FAQ, etc.)
├── chat-footer.tsx      # Bunnfelt med input og send-knapp
├── types.ts           # TypeScript-typer
└── README.md          # Denne filen
```

## Komponenter

### ChatHeader
- Viser organisasjonsnavn, status, avatar
- AI toggle og lukk-knapp
- Gradient bakgrunn med dekorative elementer

### ChatMain
- Hovedinnhold med 3 faner: Home, Chat, Help
- FAQ system med søk
- Meldingsvisning
- Quick replies

### ChatFooter
- Tekstinputfelt
- Send-knapp med loading state
- Vedlegg og emoji knapper

### Index (hovedkomponent)
- Kombinerer alle delene
- Håndterer state og API-kall
- Session management

## Bruk

```tsx
import { ChatWidget } from '@/components/chat-widget'

<ChatWidget
  config={{
    name: 'Min Chat',
    settings: {
      primaryColor: '#0066FF',
      position: 'bottom-right',
      // ... andre innstillinger
    },
    aiEnabled: true,
    isOnline: true
  }}
  onClose={() => console.log('closed')}
/>
```

## Tilpasning

Hver komponent kan redigeres separat:

- **Header**: Rediger logo, tekst, farger
- **Main**: Endre layout, faner, FAQ
- **Footer**: Tilpass inputfelt, knapper
- **Types**: Legg til nye innstillinger

Alle komponenter bruker:
- Tailwind CSS for styling
- Framer Motion for animasjoner
- TypeScript for type safety
