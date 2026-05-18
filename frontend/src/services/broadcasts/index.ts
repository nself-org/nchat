/**
 * Broadcast Services Index
 *
 * Central export for broadcast list and announcement services.
 */

export {
  BroadcastService,
  getBroadcastService,
  createBroadcastService,
  MAX_RECIPIENTS_PER_LIST,
  BROADCASTS_PER_MINUTE,
  type BroadcastList,
  type Broadcast,
  type Recipient,
  type CreateBroadcastListInput,
  type UpdateBroadcastListInput,
  type SendBroadcastInput,
  type BroadcastListsResult,
  type BroadcastHistoryResult,
  type SendBroadcastResult,
} from "./broadcast.service";
