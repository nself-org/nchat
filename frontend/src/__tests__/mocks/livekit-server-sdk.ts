/**
 * Mock for livekit-server-sdk
 * This mock prevents ESM import issues with jose dependency
 */

export class AccessToken {
  constructor() {}
  addGrant() {
    return this;
  }
  toJwt() {
    return Promise.resolve("mock-jwt-token");
  }
}

export class RoomServiceClient {
  constructor() {}
  createRoom() {
    return Promise.resolve({
      name: "mock-room",
      sid: "mock-sid",
      emptyTimeout: 300,
      maxParticipants: 100,
    });
  }
  deleteRoom() {
    return Promise.resolve();
  }
  listRooms() {
    return Promise.resolve([]);
  }
  listParticipants() {
    return Promise.resolve([]);
  }
  removeParticipant() {
    return Promise.resolve();
  }
  mutePublishedTrack() {
    return Promise.resolve();
  }
  sendData() {
    return Promise.resolve();
  }
  updateRoomMetadata() {
    return Promise.resolve();
  }
  updateParticipant() {
    return Promise.resolve();
  }
}

export class EgressClient {
  constructor() {}
  startRoomCompositeEgress() {
    return Promise.resolve({
      egressId: "egress-id",
      roomName: "test-room",
    });
  }
  stopEgress() {
    return Promise.resolve();
  }
  listEgress() {
    return Promise.resolve([
      {
        egressId: "egress-id",
        status: "active",
      },
    ]);
  }
}

export const VideoPresets = {
  h720: {},
  h1080: {},
};

export const RoomCompositeOptions = {};

export const ParticipantPermission = {
  CAN_SUBSCRIBE: 1,
  CAN_PUBLISH: 2,
  CAN_PUBLISH_DATA: 4,
};

export const EncodedFileType = {
  MP4: "MP4",
  OGG: "OGG",
};

export const EncodingOptionsPreset = {
  H264_720P_30: "H264_720P_30",
  H264_1080P_30: "H264_1080P_30",
};

export const VideoGrant = {};

export default {
  AccessToken,
  RoomServiceClient,
  EgressClient,
  VideoPresets,
  RoomCompositeOptions,
  ParticipantPermission,
  EncodedFileType,
  EncodingOptionsPreset,
  VideoGrant,
};
