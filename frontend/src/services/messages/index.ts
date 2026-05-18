/**
 * Messages Services Index
 *
 * Centralized exports for all message-related services.
 */

// Message Service
export {
  MessageService,
  getMessageService,
  createMessageService,
  type GetMessagesOptions,
  type GetMessagesResult,
  type SendMessageInput,
  type UpdateMessageInput,
  type SearchMessagesOptions,
  type MessageServiceConfig,
} from "./message.service";

// Thread Service
export {
  ThreadService,
  getThreadService,
  createThreadService,
  type GetThreadsOptions,
  type CreateThreadInput,
  type ReplyToThreadInput,
  type ThreadServiceConfig,
  type ThreadParticipant,
} from "./thread.service";

// Reaction Service
export {
  ReactionService,
  getReactionService,
  createReactionService,
  type ReactionCount,
  type AddReactionInput,
  type RemoveReactionInput,
  type ReactionServiceConfig,
} from "./reaction.service";

// Mention Service
export {
  MentionService,
  getMentionService,
  createMentionService,
  type ParsedMention,
  type ResolvedMention,
  type MentionNotificationInput,
  type MentionServiceConfig,
} from "./mention.service";

// Formatter Service
export {
  MessageFormatterService,
  getFormatterService,
  createFormatterService,
  formatMessageContent,
  sanitizeMessageHtml,
  parseMessageMarkdown,
  type CodeBlock,
  type FormattedMessage,
  type FormatterOptions,
} from "./formatter.service";

// Link Unfurl Service
export {
  LinkUnfurlService,
  getLinkUnfurlService,
  createLinkUnfurlService,
  validateUrl,
  hashUrl,
  extractDomain,
  getKnownSiteName,
  parseOpenGraph,
  parseTwitterCard,
  extractBasicMeta,
  type LinkPreviewData,
  type LinkPreviewType,
  type OpenGraphData,
  type TwitterCardData,
  type BasicMetaData,
  type UnfurlResult,
  type UnfurlErrorCode,
  type UnfurlOptions,
} from "./link-unfurl.service";

// Link Unfurl Integration
export {
  LinkUnfurlIntegration,
  getLinkUnfurlIntegration,
  createLinkUnfurlIntegration,
  type LinkUnfurlIntegrationConfig,
  type ExtractedUrl,
  type MessageLinkPreview,
  type UnfurlMessageResult,
} from "./link-unfurl-integration";

// Scheduled Message Service
export {
  ScheduledMessageService,
  getScheduledMessageService,
  createScheduledMessageService,
  type ScheduleMessageInput,
  type GetScheduledMessagesOptions,
  type GetScheduledMessagesResult,
  type UpdateScheduledMessageInput,
  type ScheduledMessagesCount,
  type ProcessScheduledMessageResult,
} from "./scheduled.service";

// Ephemeral Message Service (TTL)
export {
  EphemeralMessageService,
  getEphemeralMessageService,
  createEphemeralMessageService,
  type EphemeralMessage,
  type ChannelTTLInfo,
  type MessageTTLInfo,
  type ExpiredMessage,
  type GetEphemeralMessagesResult,
  type GetExpiredMessagesResult,
  type DeleteExpiredResult,
  type EphemeralMessageServiceConfig,
} from "./ephemeral.service";

// Receipt Service (Delivery Receipts)
export {
  ReceiptService,
  getReceiptService,
  createReceiptService,
  type ReceiptServiceConfig,
  type GetReceiptsResult,
  type MarkDeliveredResult,
  type MarkReadResult,
  type MarkChannelReadResult,
  type UnreadCountResult,
  type CreateSentReceiptsInput,
  type BulkMarkDeliveredInput,
  type ChannelReadStatus,
  type DeliveryReceipt,
  type ReceiptSummary,
  type ReceiptStatus,
} from "./receipt.service";

// Message Semantics Service (Edit/Delete/Undo)
export {
  MessageSemanticsService,
  getMessageSemanticsService,
  createMessageSemanticsService,
  type EditMessageInput,
  type EditMessageResult,
  type DeleteMessageInput,
  type DeleteMessageResult,
  type UndoResult,
  type BulkDeleteInput,
  type BulkDeleteResult,
} from "./semantics.service";

// Message Linkage Service (Reply/Quote/Thread Consistency)
export {
  MessageLinkageService,
  getLinkageService,
  createLinkageService,
  type ReplyReference,
  type QuoteSnapshot,
  type QuoteMediaSnapshot,
  type ThreadLinkage,
  type LinkageValidationResult,
  type LinkageRepairOptions,
  type ExportedLinkage,
  type ImportLinkageMapping,
  type LinkageEditConfig,
  type LinkageServiceConfig,
} from "./linkage.service";

// Message Export Service
export {
  MessageExportService,
  getMessageExportService,
  createMessageExportService,
  type ExportJob,
  type ExportJobStatus,
  type ExportProgressCallback,
} from "./export.service";
