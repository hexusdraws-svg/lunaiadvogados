# Som de Notificação

O sistema toca um som sempre que uma notificação chega (novo convite,
tarefa vencida, etc.).

## Como substituir pelo seu próprio som

1. Coloque seu arquivo **MP3** em:
   ```
   public/sounds/notification.mp3
   ```
2. O arquivo deve ser curto (< 1 segundo) e ter volume baixo.
3. Aumente ou diminua o volume editando a constante `FALLBACK_VOLUME` em
   `src/lib/notification-sound.ts`.

## Arquivos suportados

| Arquivo                       | Prioridade | Descrição                        |
|-------------------------------|------------|----------------------------------|
| `public/sounds/notification.mp3` | Máxima     | Substitua este arquivo           |
| `public/sounds/notification.wav` | Fallback   | Gerado automaticamente           |

Se nenhum arquivo for encontrado, o sistema gera um som sintético
via Web Audio API (tom 880Hz, duração ~250ms).

## Gerar um som placeholder

Para gerar um som WAV de teste:

```bash
node scripts/generate-notification-sound.cjs
```

(Requer `ffmpeg` para converter para MP3 — opcional.)
