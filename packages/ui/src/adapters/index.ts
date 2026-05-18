/**
 * @nself-chat/ui adapters
 *
 * Injectable adapters that decouple shared components from
 * platform-specific implementations (router, storage, etc.).
 */

export {
  RouterAdapterContext,
  useRouter,
  noopRouterAdapter,
  type RouterAdapter,
} from './router';
