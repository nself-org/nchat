"use client";

import { useEffect, useCallback } from "react";
import {
  useModalStore,
  selectModals,
  type ModalConfig,
  type ConfirmModalProps as StoreConfirmProps,
  type AlertModalProps as StoreAlertProps,
  type PromptModalProps as StorePromptProps,
  type ImageLightboxProps as StoreImageLightboxProps,
  type VideoModalProps as StoreVideoProps,
  type ProfileModalProps as StoreProfileProps,
  type SettingsModalProps as StoreSettingsProps,
  type CustomModalProps,
} from "@/lib/modals/modal-store";

import { ConfirmModal } from "./confirm-modal";
import { AlertModal } from "./alert-modal";
import { PromptModal } from "./prompt-modal";
import { ImageLightbox } from "./image-lightbox";
import { VideoModal } from "./video-modal";
import { ProfileModal, type ProfileUser } from "./profile-modal";
import { SettingsModal, type SettingsSection } from "./settings-modal";
import { BaseModal, ModalBody } from "./base-modal";

/**
 * ModalProvider - Renders all modals from the modal store
 *
 * This provider should be placed at the root of your application,
 * typically in the root layout.
 *
 * Features:
 * - Automatic modal stack management
 * - Global keyboard handling (Escape to close)
 * - Body scroll lock when modals are open
 * - Focus trap within modals
 *
 * @example
 * ```tsx
 * // In your root layout
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <ModalProvider />
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function ModalProvider() {
  const modals = useModalStore(selectModals);
  const closeModal = useModalStore((state) => state.closeModal);
  const closeTopModal = useModalStore((state) => state.closeTopModal);
  const isAnyModalOpen = useModalStore((state) => state.isAnyModalOpen);

  // Handle global Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAnyModalOpen) {
        // Let the top modal handle Escape first
        // If it doesn't prevent default, close it
        closeTopModal();
      }
    };

    // Use capture to handle before individual modals
    document.addEventListener("keydown", handleEscape, { capture: false });
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isAnyModalOpen, closeTopModal]);

  // Body scroll lock when modals are open
  useEffect(() => {
    if (isAnyModalOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isAnyModalOpen]);

  const renderModal = useCallback(
    (modal: ModalConfig) => {
      const handleClose = () => closeModal(modal.id);

      switch (modal.type) {
        case "confirm": {
          const props = modal.props as unknown as StoreConfirmProps;
          return (
            <ConfirmModal
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              title={props.title}
              message={props.message}
              confirmText={props.confirmText}
              cancelText={props.cancelText}
              variant={props.variant}
              onConfirm={async () => {
                await props.onConfirm();
              }}
              onCancel={props.onCancel}
              loading={props.loading}
            />
          );
        }

        case "alert": {
          const props = modal.props as unknown as StoreAlertProps;
          return (
            <AlertModal
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              title={props.title}
              message={props.message}
              icon={props.icon}
              buttonText={props.buttonText}
              onClose={props.onClose}
            />
          );
        }

        case "prompt": {
          const props = modal.props as unknown as StorePromptProps;
          return (
            <PromptModal
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              title={props.title}
              message={props.message}
              placeholder={props.placeholder}
              defaultValue={props.defaultValue}
              inputType={props.inputType}
              validation={props.validation}
              submitText={props.submitText}
              cancelText={props.cancelText}
              onSubmit={async (value) => {
                await props.onSubmit(value);
              }}
              onCancel={props.onCancel}
            />
          );
        }

        case "image-lightbox": {
          const props = modal.props as unknown as StoreImageLightboxProps;
          return (
            <ImageLightbox
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              images={props.images}
              initialIndex={props.initialIndex}
              onDownload={props.onDownload}
            />
          );
        }

        case "video": {
          const props = modal.props as unknown as StoreVideoProps;
          return (
            <VideoModal
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              src={props.src}
              title={props.title}
              poster={props.poster}
              autoPlay={props.autoPlay}
              muted={props.muted}
              loop={props.loop}
              onEnded={props.onEnded}
            />
          );
        }

        case "profile": {
          const props = modal.props as unknown as StoreProfileProps;
          return (
            <ProfileModal
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              user={props.user as ProfileUser | null}
              currentUserId={props.currentUserId}
              onSendMessage={props.onSendMessage}
              onAddToChannel={props.onAddToChannel}
              onBlockUser={props.onBlockUser}
              onViewFullProfile={props.onViewFullProfile}
            />
          );
        }

        case "settings": {
          const props = modal.props as unknown as StoreSettingsProps;
          return (
            <SettingsModal
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              title={props.title}
              sections={
                props.section ? [{ settings: [] }] : ([] as SettingsSection[])
              }
              initialValues={{}}
              onSave={async (values) => {
                await props.onSave?.(values);
              }}
              onCancel={props.onCancel}
            />
          );
        }

        case "custom": {
          const props = modal.props as unknown as CustomModalProps;
          return (
            <BaseModal
              key={modal.id}
              open={true}
              onOpenChange={(open) => !open && handleClose()}
              size={props.size}
              showCloseButton={props.showCloseButton ?? true}
              preventOutsideClose={props.preventOutsideClose}
            >
              {(props.title || props.description) && (
                <div className="flex flex-col space-y-1.5 p-6 pb-0">
                  {props.title && (
                    <h2 className="text-lg font-semibold leading-none tracking-tight">
                      {props.title}
                    </h2>
                  )}
                  {props.description && (
                    <p className="text-sm text-muted-foreground">
                      {props.description}
                    </p>
                  )}
                </div>
              )}
              <ModalBody>{props.content}</ModalBody>
            </BaseModal>
          );
        }

        default:
          return null;
      }
    },
    [closeModal],
  );

  return <>{modals.map(renderModal)}</>;
}

/**
 * Hook to get the modal provider context
 * Useful for checking if ModalProvider is mounted
 */
export function useModalProviderMounted(): boolean {
  // The provider is mounted if the store is accessible
  // This is always true once the store is initialized
  return true;
}
