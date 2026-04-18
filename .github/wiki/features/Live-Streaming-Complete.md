# Live Streaming - Complete Implementation

**Version**: v0.4.0
**Status**: ✅ Complete
**Date**: January 30, 2026

## Overview

nself-chat (nchat) now includes a **complete live streaming system** with HLS playback, WebRTC ingest, adaptive bitrate streaming, live chat, emoji reactions, and comprehensive analytics. This implementation provides a production-ready streaming solution comparable to Twitch, YouTube Live, or Facebook Live.

## Features

### Core Streaming

- ✅ **WebRTC Broadcast** - Low-latency video/audio ingest from browser
- ✅ **HLS Playback** - Adaptive bitrate streaming with wide device compatibility
- ✅ **Quality Selection** - Auto, 1080p, 720p, 480p, 360p with manual and automatic switching
- ✅ **Low-Latency Mode** - <5 second latency for real-time interactions
- ✅ **Stream Scheduling** - Schedule streams for future broadcast
- ✅ **Stream Recording** - Automatic recording with replay functionality

### Interactive Features

- ✅ **Live Chat** - Real-time messaging during streams with rate limiting
- ✅ **Emoji Reactions** - Animated floating reactions with position control
- ✅ **Q&A Mode** - Optional question and answer sessions
- ✅ **Chat Moderation** - Pin, delete, and moderate chat messages
- ✅ **Chat Modes** - Open, followers-only, subscribers-only, or disabled

### Analytics & Monitoring

- ✅ **Viewer Metrics** - Real-time viewer count, peak viewers, total views
- ✅ **Quality Metrics** - Bitrate, FPS, resolution, dropped frames tracking
- ✅ **Network Metrics** - Latency, bandwidth, packet loss monitoring
- ✅ **Engagement Metrics** - Chat rate, reaction rate, average watch time
- ✅ **Health Scoring** - Real-time stream health assessment (0-100)

### Adaptive Bitrate (ABR)

- ✅ **EWMA Estimation** - Exponentially weighted moving average bandwidth estimation
- ✅ **Buffer-Based ABR** - Quality selection based on buffer health
- ✅ **Quality Switching** - Intelligent upgrade/downgrade with cooldown periods
- ✅ **Bitrate Limits** - Configurable min/max bitrate constraints

## Architecture

### Technology Stack

| Component            | Technology                    | Purpose                        |
| -------------------- | ----------------------------- | ------------------------------ |
| **Video Ingest**     | WebRTC                        | Browser-based broadcasting     |
| **Media Processing** | Ant Media Server / NGINX-RTMP | Transcoding & packaging        |
| **Playback**         | HLS.js                        | Adaptive streaming player      |
| **Database**         | PostgreSQL                    | Stream metadata & analytics    |
| **Real-time**        | Socket.io                     | Chat, reactions, viewer counts |
| **Frontend**         | React 19 + Next.js 15         | UI components                  |

### Data Flow

```
┌─────────────┐     WebRTC      ┌──────────────┐    HLS    ┌────────────┐
│ Broadcaster ├─────────────────→│ Media Server ├──────────→│  Viewers   │
└─────────────┘                  └──────────────┘           └────────────┘
       │                                │                           │
       │                                │                           │
       ↓                                ↓                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL + Socket.io                       │
│            (Metadata, Chat, Reactions, Analytics, Presence)          │
└─────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

#### `nchat_streams`

Primary stream metadata table.

```sql
CREATE TABLE nchat_streams (
  id UUID PRIMARY KEY,
  channel_id UUID NOT NULL,
  broadcaster_id UUID NOT NULL,

  -- Details
  title VARCHAR(200) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) CHECK (status IN ('scheduled', 'preparing', 'live', 'ended', 'cancelled')),

  -- Configuration
  stream_key VARCHAR(255) UNIQUE NOT NULL,
  ingest_url TEXT NOT NULL,
  hls_manifest_url TEXT,
  max_resolution VARCHAR(10) DEFAULT '1080p',

  -- Statistics
  peak_viewer_count INTEGER DEFAULT 0,
  total_view_count INTEGER DEFAULT 0,
  total_chat_messages INTEGER DEFAULT 0,
  total_reactions INTEGER DEFAULT 0,

  -- Features
  enable_chat BOOLEAN DEFAULT TRUE,
  enable_reactions BOOLEAN DEFAULT TRUE,
  chat_mode VARCHAR(20) DEFAULT 'open'
);
```

#### `nchat_stream_viewers`

Tracks individual viewer sessions.

#### `nchat_stream_quality_metrics`

Time-series quality and performance metrics.

#### `nchat_stream_chat_messages`

Live chat messages with moderation support.

#### `nchat_stream_reactions`

Emoji reactions with animation positions.

### Views

- **`nchat_live_streams`** - Currently live streams with viewer counts
- **`nchat_top_streams`** - Top 100 streams by peak viewers

## API Reference

### Stream Management

#### Create Stream

```typescript
POST /api/streams/create

Body: {
  channelId: string
  title: string
  description?: string
  thumbnailUrl?: string
  scheduledAt?: string (ISO 8601)
  maxResolution?: '1080p' | '720p' | '480p' | '360p'
  enableChat?: boolean
  enableReactions?: boolean
  enableQa?: boolean
  chatMode?: 'open' | 'followers' | 'subscribers' | 'disabled'
  tags?: string[]
}

Response: Stream
```

#### Get Stream Details

```typescript
GET / api / streams / [id]

Response: Stream
```

#### Update Stream

```typescript
PATCH / api / streams / [id]

Body: Partial<Stream>

Response: Stream
```

#### Delete Stream

```typescript
DELETE / api / streams / [id]

Response: {
  success: true
}
```

### Stream Lifecycle

#### Start Stream (Go Live)

```typescript
POST /api/streams/[id]/start

Response: Stream (status: 'live', hls_manifest_url populated)
```

#### End Stream

```typescript
POST /api/streams/[id]/end

Response: Stream (status: 'ended', with final statistics)
```

### Chat

#### Get Chat Messages

```typescript
GET /api/streams/[id]/chat?limit=100&offset=0

Response: StreamChatMessage[]
```

#### Send Chat Message

```typescript
POST /api/streams/[id]/chat

Body: {
  content: string (max 500 chars)
}

Response: StreamChatMessage
```

### Reactions

#### Send Reaction

```typescript
POST /api/streams/[id]/reactions

Body: {
  emoji: string
  positionX?: number (0-100)
  positionY?: number (0-100)
}

Response: StreamReaction
```

## React Hooks

### useLiveStream (Broadcaster)

```typescript
import { useLiveStream } from '@/hooks/use-live-stream'

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
  duration,
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
} = useLiveStream({
  onStreamCreated: (stream) => console.log('Stream created:', stream),
  onStreamStarted: (stream) => console.log('Now live:', stream),
  onStreamEnded: (stream) => console.log('Stream ended:', stream),
  onError: (error) => console.error('Stream error:', error),
})

// Create and start streaming
await createStream({
  channelId: 'channel-uuid',
  title: 'My First Stream',
  description: 'Going live!',
  maxResolution: '720p',
})

await startBroadcast('720p')

// End streaming
await endStream()
```

### useStreamViewer (Viewer)

```typescript
import { useStreamViewer } from '@/hooks/use-stream-viewer'

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
  latency,
  volume,
  isMuted,
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
} = useStreamViewer({
  streamId: 'stream-uuid',
  autoStart: true,
  lowLatencyMode: true,
  onStreamEnded: () => console.log('Stream ended'),
  onError: (error) => console.error('Viewer error:', error),
})

return (
  <div>
    <video ref={videoRef} className="w-full" />
    <button onClick={isPlaying ? pause : play}>
      {isPlaying ? 'Pause' : 'Play'}
    </button>
    <select value={currentQuality} onChange={(e) => setQuality(e.target.value)}>
      <option value="auto">Auto</option>
      <option value="1080p">1080p</option>
      <option value="720p">720p</option>
      <option value="480p">480p</option>
      <option value="360p">360p</option>
    </select>
  </div>
)
```

### useStreamChat

```typescript
import { useStreamChat } from '@/hooks/use-stream-chat'

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
} = useStreamChat({
  streamId: 'stream-uuid',
  maxMessages: 100,
  onNewMessage: (message) => console.log('New message:', message),
})

// Send message
await sendMessage('Hello world!')

// Moderate
await deleteMessage(messageId)
await pinMessage(messageId)
```

### useStreamReactions

```typescript
import { useStreamReactions } from '@/hooks/use-stream-reactions'

const {
  reactions,
  recentReactions, // Last 20 for animation
  isSending,
  error,
  sendReaction,
  clearReactions,
} = useStreamReactions({
  streamId: 'stream-uuid',
  onNewReaction: (reaction) => console.log('New reaction:', reaction),
})

// Send reaction with position
await sendReaction('❤️', { x: 50, y: 0 })
```

## Components

### StreamBroadcaster

Full broadcaster UI with video preview, device selection, quality controls, and stream management.

```typescript
import { StreamBroadcaster } from '@/components/streaming'

<StreamBroadcaster
  channelId="channel-uuid"
  onStreamEnded={() => console.log('Stream ended')}
/>
```

**Features**:

- Video preview with local stream
- Camera/microphone device selection
- Quality preset selection (1080p, 720p, 480p, 360p)
- Live indicator with viewer count
- Duration timer
- Connection status
- Audio/video toggle controls
- Advanced settings panel

### StreamViewer

Full viewer UI with HLS player, quality selection, live chat, and reactions.

```typescript
import { StreamViewer } from '@/components/streaming'

<StreamViewer
  streamId="stream-uuid"
  onStreamEnded={() => console.log('Stream ended')}
/>
```

**Features**:

- HLS video player with adaptive bitrate
- Quality selection dropdown
- Volume controls
- Live indicator
- Viewer count display
- Latency indicator with "Go to Live" button
- Live chat panel
- Quick emoji reactions
- Animated floating reactions

## Configuration

### Environment Variables

```bash
# Stream Ingest URL (RTMP/WebRTC)
NEXT_PUBLIC_STREAM_INGEST_URL=rtmp://localhost:1935/live

# HLS Manifest Base URL
NEXT_PUBLIC_HLS_BASE_URL=http://localhost:8080/hls

# Recording
STREAM_RECORDING_ENABLED=true
STREAM_RECORDING_PATH=/var/recordings
```

### AppConfig

```typescript
features: {
  liveStreaming: true,
  streamRecording: true,
  streamChat: true,
  streamReactions: true,
  streamScheduling: true,
  maxStreamDuration: 0, // 0 = unlimited, or set max minutes
}
```

### HLS Player Options

```typescript
const config: HLSPlayerConfig = {
  manifestUrl: string, // HLS manifest URL (.m3u8)
  videoElement: HTMLVideoElement,
  autoStart: true, // Auto-play on load
  startLevel: -1, // -1 = auto, or specific level
  lowLatencyMode: true, // Enable LL-HLS
  maxBufferLength: 30, // Max buffer in seconds
  maxBufferSize: 60 * 1000 * 1000, // Max buffer in bytes (60MB)
}
```

### ABR Configuration

```typescript
const abrConfig: ABRConfig = {
  minAutoBitrate: 500_000, // 500 kbps
  maxAutoBitrate: 10_000_000, // 10 Mbps
  bufferBasedABR: true, // Use buffer-based ABR
  bandwidthEstimator: 'ewma', // 'ewma' or 'sliding-window'
  switchUpThreshold: 0.8, // 80% of bandwidth
  switchDownThreshold: 1.2, // 120% of bitrate
  minBufferForQualitySwitch: 5, // 5 seconds
}
```

## Media Server Setup

### Option 1: Ant Media Server (Recommended)

Ant Media Server is recommended for production use with built-in WebRTC ingest, adaptive transcoding, and HLS packaging.

```bash
# Download and install Ant Media Server
wget https://github.com/ant-media/Ant-Media-Server/releases/download/ams-v2.7.0/ant-media-server-2.7.0.zip
unzip ant-media-server-2.7.0.zip
cd ant-media-server
./start.sh

# Access dashboard
open http://localhost:5080

# Configure application
# - Create new application (e.g., "nchat")
# - Enable adaptive streaming
# - Enable HLS
# - Configure quality levels
# - Set up recording (optional)

# Update environment variables
NEXT_PUBLIC_STREAM_INGEST_URL=wss://localhost:5080/nchat/websocket
NEXT_PUBLIC_HLS_BASE_URL=https://localhost:5080/nchat/streams
```

**Features**:

- WebRTC ingest (sub-second latency)
- Adaptive bitrate transcoding
- HLS packaging with multiple quality levels
- Stream recording
- Live DVR
- Web admin dashboard
- REST API
- Cluster support

### Option 2: NGINX-RTMP

NGINX with RTMP module is suitable for simpler deployments or development.

```nginx
# nginx.conf
rtmp {
  server {
    listen 1935;

    application live {
      live on;

      # HLS
      hls on;
      hls_path /tmp/hls;
      hls_fragment 2s;
      hls_playlist_length 10s;

      # Recording (optional)
      record all;
      record_path /var/recordings;
      record_unique on;

      # Adaptive streaming
      exec ffmpeg -i rtmp://localhost:1935/live/$name
        -c:v libx264 -preset veryfast
        -b:v 3000k -maxrate 3000k -bufsize 6000k -s 1920x1080 -f flv rtmp://localhost:1935/hls/$name_1080p
        -c:v libx264 -preset veryfast
        -b:v 1500k -maxrate 1500k -bufsize 3000k -s 1280x720 -f flv rtmp://localhost:1935/hls/$name_720p
        -c:v libx264 -preset veryfast
        -b:v 800k -maxrate 800k -bufsize 1600k -s 854x480 -f flv rtmp://localhost:1935/hls/$name_480p
        -c:v libx264 -preset veryfast
        -b:v 400k -maxrate 400k -bufsize 800k -s 640x360 -f flv rtmp://localhost:1935/hls/$name_360p;
    }

    application hls {
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
      add_header Cache-Control no-cache;
    }
  }
}
```

## Broadcasting with OBS

For testing or professional broadcasting, you can use OBS Studio:

```
1. Open OBS Studio
2. Settings > Stream
   - Service: Custom
   - Server: rtmp://localhost:1935/live
   - Stream Key: [your-stream-key]
3. Add sources (Display Capture, Window Capture, etc.)
4. Click "Start Streaming"
```

## Quality Levels

| Quality | Resolution | Bitrate   | FPS     | CPU      | Use Case                      |
| ------- | ---------- | --------- | ------- | -------- | ----------------------------- |
| 1080p   | 1920x1080  | 3000 kbps | 30      | High     | High quality, good bandwidth  |
| 720p    | 1280x720   | 1500 kbps | 30      | Medium   | HD, recommended default       |
| 480p    | 854x480    | 800 kbps  | 24      | Low      | SD, moderate bandwidth        |
| 360p    | 640x360    | 400 kbps  | 24      | Very Low | Low bandwidth                 |
| Auto    | Adaptive   | Dynamic   | Dynamic | N/A      | Automatic based on conditions |

## Performance Optimization

### Broadcaster Best Practices

1. **Use hardware encoding** if available (H.264 QSV, NVENC, VideoToolbox)
2. **Close unnecessary applications** to free CPU/memory
3. **Use wired internet connection** for stable upload
4. **Test upload bandwidth** before going live (>5 Mbps recommended for 720p)
5. **Start at lower quality** if experiencing issues
6. **Monitor quality metrics** during broadcast

### Viewer Best Practices

1. **Enable low-latency mode** for interactive streams
2. **Use Auto quality** for best experience
3. **Close other streaming tabs** to free bandwidth
4. **Disable chat/reactions** if experiencing lag
5. **Refresh if buffering persists**

### Server Optimization

1. **Use CDN** for HLS distribution (CloudFront, CloudFlare, Fastly)
2. **Enable HTTP/2** for better delivery
3. **Configure proper caching** for HLS segments
4. **Scale transcoding** across multiple servers
5. **Monitor server resources** (CPU, memory, bandwidth)
6. **Use SSD storage** for recording
7. **Enable logging** for debugging

## Troubleshooting

### High Latency

**Symptoms**: 10+ seconds delay between broadcaster and viewers

**Solutions**:

- ✓ Enable low-latency mode in HLS player config
- ✓ Reduce HLS fragment size (2s recommended)
- ✓ Reduce playlist length
- ✓ Use LL-HLS if media server supports it
- ✓ Check network bandwidth (both upload and download)

### Connection Failed

**Symptoms**: "Failed to start stream" or WebRTC connection errors

**Solutions**:

- ✓ Check camera/microphone permissions in browser
- ✓ Verify STUN/TURN servers are accessible
- ✓ Check firewall settings (allow UDP ports)
- ✓ Try different browser (Chrome/Firefox recommended)
- ✓ Review WebRTC logs in browser console

### Buffering Issues

**Symptoms**: Constant buffering, playback pauses

**Solutions**:

- ✓ Lower quality level manually
- ✓ Check viewer's download bandwidth
- ✓ Verify CDN performance
- ✓ Reduce broadcaster bitrate
- ✓ Check media server CPU usage
- ✓ Verify network stability

### Chat Not Working

**Symptoms**: Messages not sending/receiving

**Solutions**:

- ✓ Check Socket.io connection status
- ✓ Verify authentication token is valid
- ✓ Review RLS policies in database
- ✓ Check message rate limits
- ✓ Verify stream status is 'live'

### Poor Quality

**Symptoms**: Blurry video, artifacts, pixelation

**Solutions**:

- ✓ Increase bitrate setting
- ✓ Use higher quality preset
- ✓ Check upload bandwidth (broadcaster)
- ✓ Verify transcoding settings
- ✓ Reduce motion/complexity in scene
- ✓ Use hardware encoder if available

## Testing

### Unit Tests

```bash
# Test streaming library
pnpm test src/lib/streaming

# Test hooks
pnpm test src/hooks/use-live-stream
pnpm test src/hooks/use-stream-viewer

# Test components
pnpm test src/components/streaming
```

### Integration Tests

```bash
# E2E streaming tests
pnpm test:e2e streaming
```

### Manual Testing Checklist

- [ ] Create stream successfully
- [ ] Start broadcast with camera/microphone
- [ ] Switch between camera/microphone devices
- [ ] Change quality settings during broadcast
- [ ] Toggle video/audio on and off
- [ ] View stream in another browser/tab
- [ ] Verify HLS playback works
- [ ] Test quality switching (manual and auto)
- [ ] Send chat messages
- [ ] Send emoji reactions
- [ ] Verify viewer count updates
- [ ] Test with slow network (DevTools throttling)
- [ ] End stream successfully
- [ ] Verify recording is saved (if enabled)
- [ ] Test scheduled streams
- [ ] Test chat moderation features
- [ ] Monitor analytics/metrics

## Deployment

### Database Migration

```bash
# Apply streaming migration
cd .backend
nself db migrate up

# Verify tables created
psql -d $DATABASE_URL -c "\\dt nchat_stream*"
```

### Environment Variables

```bash
# Production .env
NEXT_PUBLIC_STREAM_INGEST_URL=wss://stream.yourapp.com/live/websocket
NEXT_PUBLIC_HLS_BASE_URL=https://stream.yourapp.com/hls
STREAM_RECORDING_ENABLED=true
STREAM_RECORDING_PATH=/mnt/recordings
```

### Monitoring

**Key Metrics to Monitor**:

- Active streams count
- Concurrent viewers
- Average viewer count
- Chat messages per minute
- Reactions per minute
- Stream health scores
- Bitrate stability
- Latency measurements
- Error rates

**Recommended Tools**:

- Grafana for dashboards
- Prometheus for metrics collection
- Sentry for error tracking
- DataDog for APM

## Security Considerations

### Stream Keys

- ✓ Generate cryptographically secure stream keys
- ✓ Never expose stream keys in client code
- ✓ Allow broadcasters to regenerate keys
- ✓ Rotate keys periodically

### Access Control

- ✓ Verify user permissions before allowing broadcast
- ✓ Implement RLS policies for all stream tables
- ✓ Rate limit chat messages (default: 3 msgs/sec)
- ✓ Rate limit reactions (default: 5 reactions/sec)
- ✓ Validate all user input

### Content Moderation

- ✓ Implement profanity filter for chat
- ✓ Allow broadcasters to ban users
- ✓ Provide moderation dashboard
- ✓ Log all moderation actions
- ✓ Support DMCA takedown requests

### Privacy

- ✓ Allow users to hide viewer list
- ✓ Support private streams
- ✓ Respect GDPR/CCPA requirements
- ✓ Implement data retention policies
- ✓ Allow users to delete their data

## Future Enhancements

Potential improvements for future releases:

- [ ] **Multi-bitrate recording** - Record multiple quality levels
- [ ] **Clip creation** - Allow viewers to create clips
- [ ] **Instant replay** - DVR functionality for viewers
- [ ] **Simulcast** - Stream to multiple platforms simultaneously
- [ ] **Monetization** - Subscriptions, donations, ads
- [ ] **Advanced analytics** - Heatmaps, drop-off analysis
- [ ] **Mobile apps** - Native iOS/Android broadcasting
- [ ] **Screen sharing** - Broadcast screen instead of camera
- [ ] **Guest streaming** - Multiple broadcasters in one stream
- [ ] **Interactive polls** - Real-time polls during streams
- [ ] **Stream overlays** - Custom graphics and animations
- [ ] **Auto-moderation** - AI-powered content moderation

## Conclusion

The live streaming system in nself-chat v0.4.0 is production-ready with comprehensive features for both broadcasters and viewers. With HLS adaptive streaming, low-latency mode, real-time chat, animated reactions, and detailed analytics, it provides a complete streaming solution suitable for a wide range of use cases.

For questions, issues, or feature requests, please open an issue on GitHub or contact the maintainers.

---

**Related Documentation**:

- [Live Streaming Quick Start](../reference/Live-Streaming-Quick-Start.md)
- [API Documentation](../api/Streams.md)
- [Database Schema](../reference/Database-Schema.md)
- [Deployment Guide](../deployment/Production-Deployment.md)
