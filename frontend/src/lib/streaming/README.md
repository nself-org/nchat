# Live Streaming Library

Comprehensive live streaming system with WebRTC ingest, HLS distribution, and interactive features.

## Features

- 🎥 **WebRTC Broadcast** - Low-latency video/audio ingest from browser
- 📺 **HLS Playback** - Adaptive bitrate streaming with wide compatibility
- 💬 **Live Chat** - Real-time messaging during streams
- 😀 **Reactions** - Animated emoji reactions
- 📊 **Analytics** - Comprehensive viewer and engagement metrics
- 🎚️ **Quality Control** - Manual and automatic quality selection
- 📅 **Scheduling** - Schedule streams for future broadcast
- 💾 **Recording** - Automatic stream recording and replay

## Quick Start

### 1. Broadcasting

```typescript
import { useLiveStream } from '@/hooks/use-live-stream'

function BroadcastComponent() {
  const { createStream, startBroadcast, endStream } = useLiveStream()

  const handleGoLive = async () => {
    await createStream({
      channelId: 'channel-id',
      title: 'My First Stream',
      description: 'Going live!'
    })
    await startBroadcast('720p')
  }

  return <button onClick={handleGoLive}>Go Live</button>
}
```

### 2. Viewing

```typescript
import { useStreamViewer } from '@/hooks/use-stream-viewer'

function ViewerComponent({ streamId }: { streamId: string }) {
  const { videoRef, isPlaying, play, pause } = useStreamViewer({
    streamId,
    autoStart: true,
    lowLatencyMode: true
  })

  return (
    <div>
      <video ref={videoRef} />
      <button onClick={isPlaying ? pause : play}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
    </div>
  )
}
```

### 3. Chat

```typescript
import { useStreamChat } from '@/hooks/use-stream-chat'

function ChatComponent({ streamId }: { streamId: string }) {
  const { messages, sendMessage } = useStreamChat({ streamId })

  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      <button onClick={() => sendMessage('Hello!')}>Send</button>
    </div>
  )
}
```

### 4. Reactions

```typescript
import { useStreamReactions } from '@/hooks/use-stream-reactions'

function ReactionsComponent({ streamId }: { streamId: string }) {
  const { sendReaction, recentReactions } = useStreamReactions({ streamId })

  return (
    <div>
      <button onClick={() => sendReaction('👍')}>👍</button>
      <button onClick={() => sendReaction('❤️')}>❤️</button>
      <div className="reactions">
        {recentReactions.map(r => (
          <div key={r.id}>{r.emoji}</div>
        ))}
      </div>
    </div>
  )
}
```

## Architecture

### Core Modules

1. **stream-types.ts** - TypeScript type definitions
2. **hls-player.ts** - HLS.js wrapper for video playback
3. **stream-client.ts** - WebRTC broadcaster client
4. **stream-manager.ts** - High-level stream management API
5. **stream-analytics.ts** - Analytics and metrics collection
6. **adaptive-bitrate.ts** - ABR algorithms

### React Hooks

1. **use-live-stream.ts** - Broadcaster control
2. **use-stream-viewer.ts** - Viewer playback
3. **use-stream-chat.ts** - Live chat
4. **use-stream-reactions.ts** - Emoji reactions

## API Reference

### useLiveStream()

```typescript
const {
  // State
  stream,
  isCreating,
  isStarting,
  isBroadcasting,
  isEnding,
  localStream,
  connectionState,
  qualityMetrics,
  viewerCount,
  error,

  // Actions
  createStream,
  startBroadcast,
  stopBroadcast,
  endStream,
  switchCamera,
  switchMicrophone,
  changeQuality,
  toggleVideo,
  toggleAudio,

  // Devices
  availableCameras,
  availableMicrophones,

  // Info
  duration,
} = useLiveStream(options);
```

### useStreamViewer()

```typescript
const {
  // State
  stream,
  isLoading,
  isPlaying,
  isPaused,
  isBuffering,
  currentQuality,
  availableLevels,
  stats,
  viewerCount,
  error,

  // Actions
  play,
  pause,
  setQuality,
  setVolume,
  setMuted,
  goToLive,

  // Refs
  videoRef,

  // Info
  latency,
  volume,
  isMuted,
} = useStreamViewer(options);
```

### useStreamChat()

```typescript
const {
  messages,
  isLoading,
  isSending,
  error,
  sendMessage,
  deleteMessage,
  pinMessage,
  unpinMessage,
  clear,
} = useStreamChat(options);
```

### useStreamReactions()

```typescript
const {
  reactions,
  recentReactions,
  isSending,
  error,
  sendReaction,
  clearReactions,
} = useStreamReactions(options);
```

## Quality Levels

Supported quality presets:

| Quality | Resolution | Bitrate   | FPS     | Use Case                     |
| ------- | ---------- | --------- | ------- | ---------------------------- |
| 1080p   | 1920x1080  | 3000 kbps | 30      | High quality, good bandwidth |
| 720p    | 1280x720   | 1500 kbps | 30      | HD, recommended default      |
| 480p    | 854x480    | 800 kbps  | 24      | SD, moderate bandwidth       |
| 360p    | 640x360    | 400 kbps  | 24      | Low bandwidth                |
| auto    | Adaptive   | Dynamic   | Dynamic | Automatic selection          |

## Configuration

### Environment Variables

```bash
# Stream ingest URL (RTMP/WebRTC)
NEXT_PUBLIC_STREAM_INGEST_URL=rtmp://localhost:1935/live

# HLS manifest base URL
NEXT_PUBLIC_HLS_BASE_URL=http://localhost:8080/hls

# Recording
STREAM_RECORDING_ENABLED=true
STREAM_RECORDING_PATH=/var/recordings
```

### HLS Player Options

```typescript
{
  manifestUrl: string,           // Required: HLS manifest URL
  videoElement: HTMLVideoElement, // Required: Video element
  autoStart?: boolean,            // Auto-play on load (default: true)
  startLevel?: number,            // Initial quality level (default: -1 = auto)
  lowLatencyMode?: boolean,       // Enable low-latency (default: true)
  maxBufferLength?: number,       // Max buffer in seconds (default: 30)
  maxBufferSize?: number,         // Max buffer size in bytes (default: 60MB)
}
```

### Adaptive Bitrate Config

```typescript
{
  minAutoBitrate: number,         // Min bitrate for ABR (default: 500kbps)
  maxAutoBitrate: number,         // Max bitrate for ABR (default: 10Mbps)
  bufferBasedABR: boolean,        // Use buffer-based ABR (default: true)
  bandwidthEstimator: 'ewma' | 'sliding-window', // Algorithm (default: 'ewma')
  switchUpThreshold: number,      // Threshold for upgrading (default: 0.8)
  switchDownThreshold: number,    // Threshold for downgrading (default: 1.2)
  minBufferForQualitySwitch: number, // Min buffer for switch (default: 5s)
}
```

## Media Server Setup

### Option 1: Ant Media Server (Recommended)

```bash
# Download and install
wget https://github.com/ant-media/Ant-Media-Server/releases/download/ams-v2.7.0/ant-media-server-2.7.0.zip
unzip ant-media-server-2.7.0.zip
cd ant-media-server
./start.sh

# Access dashboard: http://localhost:5080
```

### Option 2: NGINX-RTMP

```nginx
rtmp {
  server {
    listen 1935;
    application live {
      live on;
      hls on;
      hls_path /tmp/hls;
      hls_fragment 2s;
      hls_playlist_length 10s;
    }
  }
}

http {
  server {
    listen 8080;
    location /hls {
      types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
      }
      root /tmp;
      add_header Access-Control-Allow-Origin *;
    }
  }
}
```

## Performance Tips

1. **Use Low-Latency Mode**: Enable for <5s latency
2. **Adaptive Bitrate**: Let viewers auto-select quality
3. **CDN Distribution**: Use CDN for HLS segments
4. **Hardware Acceleration**: Enable in transcoding
5. **Buffer Configuration**: Tune for your use case
6. **Network Estimation**: Monitor and adapt to conditions

## Testing

### Unit Tests

```bash
pnpm test src/lib/streaming
```

### Integration Tests

```bash
pnpm test:e2e streaming
```

### Manual Testing

1. Start media server
2. Create stream via UI
3. Start broadcasting
4. Open viewer in another browser/tab
5. Test chat and reactions
6. Monitor quality metrics

## Troubleshooting

### High Latency

- ✓ Enable low-latency mode
- ✓ Reduce HLS fragment size
- ✓ Check network bandwidth
- ✓ Use LL-HLS if supported

### Connection Failed

- ✓ Check camera/microphone permissions
- ✓ Verify STUN/TURN servers
- ✓ Check firewall settings
- ✓ Review WebRTC logs

### Buffering Issues

- ✓ Lower quality level
- ✓ Check upload bandwidth (broadcaster)
- ✓ Check download bandwidth (viewer)
- ✓ Verify CDN performance

### Chat Not Working

- ✓ Check Socket.io connection
- ✓ Verify authentication
- ✓ Review RLS policies
- ✓ Check message rate limits

## Best Practices

1. **Always handle errors** - Use onError callbacks
2. **Clean up resources** - Stop streams when unmounting
3. **Validate input** - Check titles, messages before sending
4. **Monitor metrics** - Track quality and engagement
5. **Test on real networks** - Mobile, slow connections
6. **Limit message length** - 500 char max for chat
7. **Rate limit reactions** - Prevent spam
8. **Use TypeScript** - Type safety prevents bugs

## Examples

See full examples in:

- `/src/components/streaming/StreamBroadcaster.tsx`
- `/src/components/streaming/StreamViewer.tsx`
- `/docs/Live-Streaming-Implementation.md`
- `/docs/Live-Streaming-Quick-Start.md`

## Support

- **Documentation**: See `/docs/Live-Streaming-*.md`
- **Issues**: Check browser console and backend logs
- **Testing**: Use OBS Studio for broadcast testing
- **Media Server**: Ant Media Server recommended for production

## License

See main project LICENSE file.
