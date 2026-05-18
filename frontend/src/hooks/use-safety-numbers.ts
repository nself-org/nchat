/**
 * React Hook: useSafetyNumbers
 * Hook for safety number generation and verification
 */

import { useState, useCallback } from "react";
import { useApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import { useToast } from "./use-toast";

const SAVE_SAFETY_NUMBER = gql`
  mutation SaveSafetyNumber(
    $peerUserId: uuid!
    $safetyNumber: String!
    $userIdentityFingerprint: String!
    $peerIdentityFingerprint: String!
  ) {
    insert_nchat_safety_numbers_one(
      object: {
        peer_user_id: $peerUserId
        safety_number: $safetyNumber
        user_identity_fingerprint: $userIdentityFingerprint
        peer_identity_fingerprint: $peerIdentityFingerprint
        is_verified: false
      }
      on_conflict: {
        constraint: nchat_safety_numbers_user_id_peer_user_id_key
        update_columns: [
          safety_number
          user_identity_fingerprint
          peer_identity_fingerprint
          updated_at
        ]
      }
    ) {
      id
      safety_number
    }
  }
`;

const VERIFY_SAFETY_NUMBER = gql`
  mutation VerifySafetyNumber($peerUserId: uuid!) {
    update_nchat_safety_numbers(
      where: { peer_user_id: { _eq: $peerUserId } }
      _set: { is_verified: true, verified_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        is_verified
        verified_at
      }
    }
  }
`;

const GET_SAFETY_NUMBER = gql`
  query GetSafetyNumber($peerUserId: uuid!) {
    nchat_safety_numbers(where: { peer_user_id: { _eq: $peerUserId } }) {
      id
      safety_number
      is_verified
      verified_at
      user_identity_fingerprint
      peer_identity_fingerprint
      created_at
      updated_at
    }
  }
`;

export interface SafetyNumber {
  id: string;
  safetyNumber: string;
  formattedSafetyNumber: string;
  qrCodeData: string;
  isVerified: boolean;
  verifiedAt?: Date;
  userFingerprint: string;
  peerFingerprint: string;
}

export interface UseSafetyNumbersReturn {
  // State
  safetyNumber: SafetyNumber | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  generateSafetyNumber: (
    localUserId: string,
    peerUserId: string,
    peerDeviceId: string,
  ) => Promise<SafetyNumber>;
  verifySafetyNumber: (peerUserId: string) => Promise<void>;
  loadSafetyNumber: (peerUserId: string) => Promise<SafetyNumber | null>;
  compareSafetyNumbers: (
    displayedNumber: string,
    scannedNumber: string,
  ) => boolean;
}

export function useSafetyNumbers(): UseSafetyNumbersReturn {
  const apolloClient = useApolloClient();
  const { toast } = useToast();
  const [safetyNumber, setSafetyNumber] = useState<SafetyNumber | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate safety number
  const generateSafetyNumber = useCallback(
    async (
      localUserId: string,
      peerUserId: string,
      peerDeviceId: string,
    ): Promise<SafetyNumber> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/e2ee/safety-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "generate",
            localUserId,
            peerUserId,
            peerDeviceId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to generate safety number");
        }

        const data = await response.json();

        // Save to database
        // Note: Identity fingerprints are placeholder values until E2EE key export is implemented
        await apolloClient.mutate({
          mutation: SAVE_SAFETY_NUMBER,
          variables: {
            peerUserId,
            safetyNumber: data.safetyNumber,
            userIdentityFingerprint: "user_fingerprint",
            peerIdentityFingerprint: "peer_fingerprint",
          },
        });

        const result: SafetyNumber = {
          id: "",
          safetyNumber: data.safetyNumber,
          formattedSafetyNumber: data.formattedSafetyNumber,
          qrCodeData: data.qrCodeData,
          isVerified: false,
          userFingerprint: "user_fingerprint",
          peerFingerprint: "peer_fingerprint",
        };

        setSafetyNumber(result);
        return result;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to generate safety number";
        setError(errorMessage);

        toast({
          title: "Safety Number Error",
          description: errorMessage,
          variant: "destructive",
        });

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apolloClient, toast],
  );

  // Verify safety number
  const verifySafetyNumber = useCallback(
    async (peerUserId: string) => {
      setIsLoading(true);

      try {
        await apolloClient.mutate({
          mutation: VERIFY_SAFETY_NUMBER,
          variables: { peerUserId },
        });

        if (safetyNumber) {
          setSafetyNumber({
            ...safetyNumber,
            isVerified: true,
            verifiedAt: new Date(),
          });
        }

        toast({
          title: "Safety Number Verified",
          description: "The identity has been verified successfully",
        });
      } catch (err: any) {
        toast({
          title: "Verification Failed",
          description: err.message,
          variant: "destructive",
        });

        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [apolloClient, safetyNumber, toast],
  );

  // Load safety number from database
  const loadSafetyNumber = useCallback(
    async (peerUserId: string): Promise<SafetyNumber | null> => {
      setIsLoading(true);

      try {
        const { data } = await apolloClient.query({
          query: GET_SAFETY_NUMBER,
          variables: { peerUserId },
          fetchPolicy: "network-only",
        });

        if (data.nchat_safety_numbers.length === 0) {
          return null;
        }

        const sn = data.nchat_safety_numbers[0];

        // Format safety number
        const formatted =
          sn.safety_number.match(/.{1,5}/g)?.join(" ") || sn.safety_number;

        const result: SafetyNumber = {
          id: sn.id,
          safetyNumber: sn.safety_number,
          formattedSafetyNumber: formatted,
          qrCodeData: "", // QR code is generated on-demand via generateSafetyNumber
          isVerified: sn.is_verified,
          verifiedAt: sn.verified_at ? new Date(sn.verified_at) : undefined,
          userFingerprint: sn.user_identity_fingerprint,
          peerFingerprint: sn.peer_identity_fingerprint,
        };

        setSafetyNumber(result);
        return result;
      } catch (err: any) {
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [apolloClient],
  );

  // Compare two safety numbers
  const compareSafetyNumbers = useCallback(
    (displayedNumber: string, scannedNumber: string): boolean => {
      // Remove spaces and compare
      const clean1 = displayedNumber.replace(/\s/g, "");
      const clean2 = scannedNumber.replace(/\s/g, "");
      return clean1 === clean2;
    },
    [],
  );

  return {
    safetyNumber,
    isLoading,
    error,
    generateSafetyNumber,
    verifySafetyNumber,
    loadSafetyNumber,
    compareSafetyNumbers,
  };
}

export default useSafetyNumbers;
