/**
 * Call Services - Entry Point
 *
 * Exports all call-related services for voice and video calling.
 */

export {
  OneToOneCallService,
  createOneToOneCallService,
  type CallType,
  type CallStatus,
  type CallParticipant,
  type CallConfig,
  type CallInfo,
  type CallMetrics,
  type OneToOneCallServiceConfig,
} from "./one-to-one-call.service";

export {
  CallHistoryService,
  createCallHistoryService,
  formatCallDuration,
  formatCallTime,
  getCallStatusLabel,
  type CallHistoryType,
  type CallHistoryDirection,
  type CallHistoryStatus,
  type CallHistoryEntry,
  type CallHistoryFilter,
  type CallHistoryStats,
} from "./call-history.service";

// Quality Metrics Service
export {
  CallQualityMetricsService,
  getCallQualityMetricsService,
  type QualityLevel,
  type NetworkType,
  type TimeGranularity,
  type QualityMetricsSummary,
  type UserQualityHistory,
  type RoomQualityStats,
  type QualityTimeSeriesPoint,
  type PercentileMetrics,
  type GeographicBreakdown,
  type NetworkTypeBreakdown,
  type DeviceBreakdown,
  type QualityFilters,
} from "./quality-metrics.service";

// Quality Alerting Service
export {
  CallQualityAlertingService,
  getCallQualityAlertingService,
  type AlertSeverity,
  type AlertChannel,
  type AlertType,
  type AlertThreshold,
  type AlertConfig,
  type AlertChannelConfig,
  type AlertSuppressionRule,
  type EscalationRule,
  type Alert,
  type AlertHistory,
  type AlertMetrics,
} from "./quality-alerting.service";

// Incident Analysis Service
export {
  IncidentAnalysisService,
  getIncidentAnalysisService,
  type CallTimelineEvent,
  type CallReplayData,
  type ParticipantInfo,
  type Incident,
  type IncidentType,
  type RootCause,
  type RootCauseType,
  type ImpactAssessment,
  type IncidentComparison,
  type SimilarIncident,
  type IncidentPattern,
  type AnalysisFilters,
} from "./incident-analysis.service";

// Group Call Service
export {
  GroupCallService,
  createGroupCallService,
  type GroupCallType,
  type GroupCallStatus,
  type ParticipantRole,
  type LayoutType,
  type LobbyStatus,
  type GroupCallParticipant,
  type GroupCallConfig,
  type GroupCallInfo,
  type GroupCallMetrics,
  type GroupCallServiceConfig,
} from "./group-call.service";

// Huddle Service
export {
  HuddleService,
  createHuddleService,
  formatHuddleDuration,
  getHuddleStatusLabel,
  type HuddleStatus,
  type HuddleType,
  type HuddleParticipant,
  type HuddleInfo,
  type HuddleConfig,
  type HuddleReaction,
  type HuddleServiceConfig,
} from "./huddle.service";

// Stage Channel Service
export {
  StageChannelService,
  createStageChannelService,
  StageEventService,
  createStageEventService,
  type StageServiceConfig,
  type StageServiceOptions,
  type StageChannel,
  type StageParticipant,
  type StageRole,
  type StageStatus,
  type StageSettings,
  type RaiseHandRequest,
  type HandRaiseStatus,
  type StageEvent,
  type StageEventStatus,
  type StageMetrics,
  type StageModerationAction,
  type StageModerationLog,
  type CreateStageChannelInput,
  type UpdateStageChannelInput,
  type CreateStageEventInput,
  type UpdateStageEventInput,
  type StageServiceCallbacks,
  type StageConnectionState,
  type StageEventInterest,
} from "./stage.service";

// Voice Chat Service (Telegram-style)
export {
  VoiceChatService,
  createVoiceChatService,
  type VoiceChatServiceConfig,
  type VoiceChatServiceOptions,
  type VoiceChat,
  type VoiceChatParticipant,
  type VoiceChatRole,
  type VoiceChatStatus,
  type VoiceChatSettings,
  type VoiceChatHandRequest,
  type VoiceChatHandStatus,
  type VoiceChatMetrics,
  type VoiceChatModerationAction,
  type VoiceChatModerationLog,
  type VoiceChatRecording,
  type RecordingStatus,
  type VoiceChatConnectionState,
  type VoiceChatServiceCallbacks,
  type CreateVoiceChatInput,
  type UpdateVoiceChatInput,
  type ScheduledVoiceChat,
  type ScheduledVoiceChatStatus,
  type ScheduleVoiceChatInput,
  type UpdateScheduledVoiceChatInput,
  type VoiceChatInterest,
  type PushToTalkMode,
} from "./voice-chat.service";
