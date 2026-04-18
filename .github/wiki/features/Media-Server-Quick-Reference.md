# Media Server Quick Reference

Quick reference guide for nself-chat media server operations.

## Services

| Service      | Port | URL                    | Purpose          |
| ------------ | ---- | ---------------------- | ---------------- |
| Media Server | 3100 | http://localhost:3100  | Main API         |
| TURN Server  | 3478 | turn:localhost:3478    | NAT traversal    |
| Redis        | 6379 | redis://localhost:6379 | State management |
| Prometheus   | 9091 | http://localhost:9091  | Metrics          |
| Grafana      | 3001 | http://localhost:3001  | Dashboards       |

## Common Commands

### Start/Stop

```bash
# Start all services
docker-compose -f docker-compose.media.yml up -d

# Stop all services
docker-compose -f docker-compose.media.yml down

# Restart specific service
docker-compose -f docker-compose.media.yml restart media-server

# View logs
docker-compose -f docker-compose.media.yml logs -f media-server

# View all logs
docker-compose -f docker-compose.media.yml logs -f
```

### Monitoring

```bash
# Health check
curl http://localhost:3100/api/health

# Server stats (requires JWT)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/api/stats

# ICE servers config
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/api/ice-servers

# Container stats
docker stats nself-media-server

# View metrics
curl http://localhost:3100/metrics
```

### Debugging

```bash
# Follow logs
docker logs -f nself-media-server

# Execute commands in container
docker exec -it nself-media-server sh

# Check FFmpeg
docker exec nself-media-server which ffmpeg

# Check recording directory
docker exec nself-media-server ls -la /recordings

# Test Redis
docker exec nself-redis-media redis-cli ping

# Check network
docker network inspect nself-network
```

### Scaling

```bash
# Scale media servers
docker-compose -f docker-compose.media.yml up -d --scale media-server=3

# View running instances
docker-compose -f docker-compose.media.yml ps
```

### Maintenance

```bash
# Pull latest images
docker-compose -f docker-compose.media.yml pull

# Rebuild images
docker-compose -f docker-compose.media.yml build --no-cache

# Clean up old recordings
docker exec nself-media-server find /recordings -mtime +7 -delete

# Backup Redis data
docker exec nself-redis-media redis-cli SAVE

# View disk usage
docker exec nself-media-server df -h
```

## Environment Variables

### Required

```bash
MEDIA_SERVER_PUBLIC_IP=your.public.ip.address
JWT_SECRET=your-secure-secret
TURN_CREDENTIAL=your-turn-secret
```

### Common

```bash
# MediaSoup
MEDIASOUP_NUM_WORKERS=4
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999

# Recording
RECORDING_ENABLED=true
RECORDING_DIR=/recordings

# CORS
CORS_ORIGIN=https://your-frontend.com

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Public

```bash
# Health check
GET /api/health

# Root
GET /
```

### Authenticated

All require `Authorization: Bearer <token>` header.

```bash
# Server stats
GET /api/stats

# ICE servers
GET /api/ice-servers

# Create/get room
POST /api/rooms/:roomId

# Get room info
GET /api/rooms/:roomId

# Close room
DELETE /api/rooms/:roomId

# Start recording
POST /api/rooms/:roomId/recordings

# Stop recording
POST /api/rooms/:roomId/recordings/:id/stop

# Get recording status
GET /api/rooms/:roomId/recordings/:id
```

## Socket.IO Events

### Client → Server

```typescript
// Join room
socket.emit('join-room', {
  roomId: 'room-123',
  userId: 'user-456',
  displayName: 'John Doe',
  rtpCapabilities: device.rtpCapabilities
}, (response) => {
  console.log(response);
});

// Create transport
socket.emit('create-transport', {
  roomId: 'room-123',
  participantId: 'participant-789',
  direction: 'send' // or 'recv'
}, (response) => {
  // response.id, .iceParameters, .dtlsParameters
});

// Connect transport
socket.emit('connect-transport', {
  roomId: 'room-123',
  participantId: 'participant-789',
  transportId: 'transport-abc',
  dtlsParameters: {...}
}, (response) => {
  console.log('Transport connected');
});

// Produce media
socket.emit('produce', {
  roomId: 'room-123',
  participantId: 'participant-789',
  transportId: 'transport-abc',
  kind: 'video', // or 'audio'
  rtpParameters: {...}
}, (response) => {
  // response.producerId
});

// Consume media
socket.emit('consume', {
  roomId: 'room-123',
  participantId: 'participant-789',
  producerId: 'producer-xyz',
  rtpCapabilities: device.rtpCapabilities
}, (response) => {
  // response.consumerId, .rtpParameters
});
```

### Server → Client

```typescript
// Participant joined
socket.on('participant-joined', (data) => {
  console.log('Participant joined:', data.participantId)
})

// Participant left
socket.on('participant-left', (data) => {
  console.log('Participant left:', data.participantId)
})

// New producer
socket.on('new-producer', (data) => {
  console.log('New producer:', data.producerId)
  // Start consuming
})

// Producer paused
socket.on('producer-paused', (data) => {
  console.log('Producer paused:', data.producerId)
})

// Producer resumed
socket.on('producer-resumed', (data) => {
  console.log('Producer resumed:', data.producerId)
})

// Producer closed
socket.on('producer-closed', (data) => {
  console.log('Producer closed:', data.producerId)
})
```

## Configuration Files

### Main Config

```typescript
// .backend/custom-services/media-server/src/config.ts
export const config = {
  server: { port: 3100, host: '0.0.0.0' },
  mediasoup: {
    numWorkers: 4,
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },
  recording: {
    enabled: true,
    dir: '/recordings',
  },
}
```

### TURN Server

```conf
# .backend/coturn/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=0.0.0.0
realm=nself.chat
user=nself:nself-turn-secret
```

### Docker Compose

```yaml
# .backend/docker-compose.media.yml
services:
  media-server:
    build: ./custom-services/media-server
    ports:
      - '3100:3100'
      - '40000-49999:40000-49999/udp'
    environment:
      MEDIASOUP_ANNOUNCED_IP: ${MEDIA_SERVER_PUBLIC_IP}
```

## Troubleshooting Quick Fixes

### Cannot Connect

```bash
# Check if running
docker ps | grep media-server

# Check logs
docker logs nself-media-server --tail 50

# Restart
docker-compose -f docker-compose.media.yml restart media-server
```

### TURN Not Working

```bash
# Check coturn logs
docker logs nself-coturn --tail 50

# Test TURN (requires coturn-utils)
turnutils_uclient -v -u nself -w nself-turn-secret localhost

# Check ports
netstat -tuln | grep 3478
```

### Poor Video Quality

```typescript
// Increase bitrate in config.ts
maxIncomingBitrate: 2000000,
initialAvailableOutgoingBitrate: 1500000,

// Enable simulcast (client-side)
encodings: [
  { maxBitrate: 100000 },
  { maxBitrate: 500000 },
  { maxBitrate: 1500000 },
]
```

### Recording Failed

```bash
# Check FFmpeg
docker exec nself-media-server which ffmpeg

# Check permissions
docker exec nself-media-server ls -la /recordings

# Check disk space
docker exec nself-media-server df -h

# View recording logs
docker logs nself-media-server | grep recording
```

### High CPU Usage

```bash
# Check worker count
echo $MEDIASOUP_NUM_WORKERS  # Should match CPU cores

# View stats
docker stats nself-media-server

# Check room count
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/api/stats | jq '.rooms'
```

### Memory Leak

```bash
# Monitor memory
watch -n 1 'docker stats nself-media-server --no-stream'

# Restart if needed
docker-compose -f docker-compose.media.yml restart media-server

# Check for hung rooms
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3100/api/stats | jq '.rooms.list'
```

## Firewall Rules

### Linux (ufw)

```bash
sudo ufw allow 3100/tcp   # Media server API
sudo ufw allow 3478/tcp   # TURN TCP
sudo ufw allow 3478/udp   # TURN UDP
sudo ufw allow 5349/tcp   # TURNS (TLS)
sudo ufw allow 40000:49999/tcp  # RTC
sudo ufw allow 40000:49999/udp  # RTC
sudo ufw allow 49152:65535/udp  # TURN relay
```

### Linux (iptables)

```bash
iptables -A INPUT -p tcp --dport 3100 -j ACCEPT
iptables -A INPUT -p tcp --dport 3478 -j ACCEPT
iptables -A INPUT -p udp --dport 3478 -j ACCEPT
iptables -A INPUT -p tcp --dport 5349 -j ACCEPT
iptables -A INPUT -p tcp --dport 40000:49999 -j ACCEPT
iptables -A INPUT -p udp --dport 40000:49999 -j ACCEPT
iptables -A INPUT -p udp --dport 49152:65535 -j ACCEPT
```

### Cloud Providers

#### AWS Security Group

```
Type: Custom TCP, Port: 3100, Source: 0.0.0.0/0
Type: Custom TCP, Port: 3478, Source: 0.0.0.0/0
Type: Custom UDP, Port: 3478, Source: 0.0.0.0/0
Type: Custom TCP, Port: 40000-49999, Source: 0.0.0.0/0
Type: Custom UDP, Port: 40000-49999, Source: 0.0.0.0/0
```

#### GCP Firewall Rules

```bash
gcloud compute firewall-rules create media-server \
  --allow tcp:3100,tcp:3478,udp:3478,tcp:40000-49999,udp:40000-49999
```

## Performance Tuning

### System Limits

```bash
# /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768

# Apply without reboot
ulimit -n 65536
```

### Docker Resources

```yaml
media-server:
  deploy:
    resources:
      limits:
        cpus: '4.0'
        memory: 4G
```

### Kernel Parameters

```bash
# /etc/sysctl.conf
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
net.core.netdev_max_backlog = 5000

# Apply
sysctl -p
```

## Metrics

### Key Metrics to Monitor

```
# Rooms
media_rooms_total
media_rooms_active

# Participants
media_participants_total
media_participants_per_room_avg

# Recordings
media_recordings_active
media_recordings_completed
media_recordings_failed

# Performance
media_cpu_usage_percent
media_memory_usage_bytes
media_network_bytes_sent
media_network_bytes_received

# Workers
media_workers_total
media_workers_busy
```

### Grafana Queries

```
# Active participants
sum(media_participants_total)

# Room capacity
(media_rooms_total / media_rooms_max) * 100

# Average participants per room
media_participants_total / media_rooms_total

# Recording success rate
(media_recordings_completed / (media_recordings_completed + media_recordings_failed)) * 100
```

## Security Checklist

- [ ] Strong JWT secret (32+ characters)
- [ ] TURN credential secured
- [ ] CORS origin restricted
- [ ] Rate limiting enabled
- [ ] Helmet security headers enabled
- [ ] TLS/DTLS for TURN in production
- [ ] Firewall rules configured
- [ ] Redis password set (production)
- [ ] Regular security updates
- [ ] Monitoring and alerting setup

## Production Checklist

- [ ] Public IP configured
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules applied
- [ ] Monitoring enabled
- [ ] Log aggregation setup
- [ ] Backup strategy defined
- [ ] Scaling plan documented
- [ ] Load balancer configured (multi-instance)
- [ ] Health checks enabled
- [ ] Alerting rules configured
- [ ] Documentation updated
- [ ] Team trained

## Quick Links

- [Full Setup Guide](./Media-Server-Setup.md)
- [Media Server README](README.md)
- [Docker Compose File](../../.backend/docker-compose.media.yml)
- [MediaSoup Docs](https://mediasoup.org/)
- [coturn Docs](https://github.com/coturn/coturn)
