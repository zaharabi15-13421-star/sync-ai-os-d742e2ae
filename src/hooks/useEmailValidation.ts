import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkEmailExists } from "@/lib/auth-flow.functions";
import {
  validateEmailFormat,
  detectEmailTypo,
  type EmailFormatResult,
} from "@/utils/emailValidator";

export type EmailState = "empty" | "typing" | "invalid" | "typo_warning" | "valid";

export interface UseEmailValidationResult {
  emailValue: string;
  emailState: EmailState;
  emailError: string | null;
  emailTypoSuggestion: { suggested: string; domain: string } | null;
  isCheckingDuplicate: boolean;
  duplicateExists: boolean;
  handleEmailChange: (value: string) => void;
  handleEmailBlur: () => void;
  handleEmailPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  acceptTypoSuggestion: () => void;
  dismissTypoWarning: () => void;
  resetEmail: () => void;
  isEmailValid: boolean;
  forceValidate: () => boolean;
}

interface DupCache {
  email: string;
  exists: boolean;
  timestamp: number;
}

const TYPING_DEBOUNCE_MS = 600;
const DUP_DEBOUNCE_MS = 800;
const DUP_CACHE_TTL_MS = 60_000;
const DUP_TIMEOUT_MS = 3000;
const MAX_DUP_CALLS = 10;

export function useEmailValidation(): UseEmailValidationResult {
  const [emailValue, setEmailValue] = useState("");
  const [emailState, setEmailState] = useState<EmailState>("empty");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTypoSuggestion, setTypo] = useState<{ suggested: string; domain: string } | null>(null);
  const [isCheckingDuplicate, setChecking] = useState(false);
  const [duplicateExists, setDuplicateExists] = useState(false);

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurredOnce = useRef(false);
  const dismissedTypoFor = useRef<Set<string>>(new Set());
  const dupCacheRef = useRef<DupCache | null>(null);
  const dupCallCount = useRef(0);
  const checkEmailFn = useServerFn(checkEmailExists);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (dupTimer.current) clearTimeout(dupTimer.current);
    };
  }, []);

  const applyFormat = useCallback((value: string): EmailFormatResult => {
    return validateEmailFormat(value);
  }, []);

  const computeState = useCallback(
    (value: string, blurred: boolean): void => {
      if (!value.trim()) {
        setEmailState("empty");
        setEmailError(null);
        setTypo(null);
        setDuplicateExists(false);
        return;
      }

      const fmt = applyFormat(value);
      if (!fmt.valid) {
        if (blurred || value.length >= 6) {
          setEmailState("invalid");
          setEmailError(fmt.message ?? "Please enter a valid email address");
          setTypo(null);
        } else {
          setEmailState("typing");
          setEmailError(null);
          setTypo(null);
        }
        return;
      }

      // Format OK -> typo check
      const lower = value.trim().toLowerCase();
      if (!dismissedTypoFor.current.has(lower)) {
        const typo = detectEmailTypo(lower);
        if (typo.isTypo && typo.suggestedEmail && typo.suggestedDomain) {
          setEmailState("typo_warning");
          setEmailError(null);
          setTypo({ suggested: typo.suggestedEmail, domain: typo.suggestedDomain });
          return;
        }
      }

      if (duplicateExists && dupCacheRef.current?.email === lower) {
        setEmailState("invalid");
        setEmailError("An account with this email already exists.");
        setTypo(null);
        return;
      }

      setEmailState("valid");
      setEmailError(null);
      setTypo(null);
    },
    [applyFormat, duplicateExists],
  );

  const runDuplicateCheck = useCallback(
    async (value: string) => {
      const lower = value.trim().toLowerCase();
      if (!lower) return;
      const cached = dupCacheRef.current;
      if (cached && cached.email === lower && Date.now() - cached.timestamp < DUP_CACHE_TTL_MS) {
        setDuplicateExists(cached.exists);
        if (cached.exists) {
          setEmailState("invalid");
          setEmailError("An account with this email already exists.");
        }
        return;
      }
      if (dupCallCount.current >= MAX_DUP_CALLS) return;
      dupCallCount.current++;
      setChecking(true);
      try {
        const result = await Promise.race<{ exists: boolean } | "timeout">([
          checkEmailFn({ data: { email: lower } }),
          new Promise<"timeout">((r) => setTimeout(() => r("timeout"), DUP_TIMEOUT_MS)),
        ]);
        if (result === "timeout") {
          // Be lenient — server will check on submit
          return;
        }
        dupCacheRef.current = { email: lower, exists: result.exists, timestamp: Date.now() };
        setDuplicateExists(result.exists);
        if (result.exists) {
          setEmailState("invalid");
          setEmailError("An account with this email already exists.");
        }
      } catch {
        // network error — be lenient
      } finally {
        setChecking(false);
      }
    },
    [checkEmailFn],
  );

  const handleEmailChange = useCallback(
    (value: string) => {
      setEmailValue(value);
      setDuplicateExists(false);
      if (typingTimer.current) clearTimeout(typingTimer.current);

      // immediate "typing" feedback for short input
      if (!value.trim()) {
        setEmailState("empty");
        setEmailError(null);
        setTypo(null);
        return;
      }
      if (value.length < 6 && !blurredOnce.current) {
        setEmailState("typing");
        setEmailError(null);
        setTypo(null);
        return;
      }

      typingTimer.current = setTimeout(() => {
        computeState(value, blurredOnce.current);
      }, TYPING_DEBOUNCE_MS);
    },
    [computeState],
  );

  const handleEmailBlur = useCallback(() => {
    blurredOnce.current = true;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (dupTimer.current) clearTimeout(dupTimer.current);
    computeState(emailValue, true);
    const fmt = applyFormat(emailValue);
    const lower = emailValue.trim().toLowerCase();
    if (fmt.valid && !dismissedTypoFor.current.has(lower)) {
      const typo = detectEmailTypo(lower);
      if (typo.isTypo) return;
    }
    if (fmt.valid) {
      dupTimer.current = setTimeout(() => runDuplicateCheck(emailValue), DUP_DEBOUNCE_MS);
    }
  }, [emailValue, computeState, applyFormat, runDuplicateCheck]);

  const handleEmailPaste = useCallback(
    (_e: React.ClipboardEvent<HTMLInputElement>) => {
      setTimeout(() => {
        blurredOnce.current = true;
        // value will already be in input via onChange; rely on next state
      }, 0);
    },
    [],
  );

  const acceptTypoSuggestion = useCallback(() => {
    if (!emailTypoSuggestion) return;
    const next = emailTypoSuggestion.suggested;
    setEmailValue(next);
    setTypo(null);
    blurredOnce.current = true;
    computeState(next, true);
    const fmt = applyFormat(next);
    if (fmt.valid) {
      if (dupTimer.current) clearTimeout(dupTimer.current);
      dupTimer.current = setTimeout(() => runDuplicateCheck(next), DUP_DEBOUNCE_MS);
    }
  }, [emailTypoSuggestion, computeState, applyFormat, runDuplicateCheck]);

  const dismissTypoWarning = useCallback(() => {
    const lower = emailValue.trim().toLowerCase();
    dismissedTypoFor.current.add(lower);
    setTypo(null);
    computeState(emailValue, true);
    const fmt = applyFormat(emailValue);
    if (fmt.valid) {
      if (dupTimer.current) clearTimeout(dupTimer.current);
      dupTimer.current = setTimeout(() => runDuplicateCheck(emailValue), DUP_DEBOUNCE_MS);
    }
  }, [emailValue, computeState, applyFormat, runDuplicateCheck]);

  const resetEmail = useCallback(() => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    if (dupTimer.current) clearTimeout(dupTimer.current);
    setEmailValue("");
    setEmailState("empty");
    setEmailError(null);
    setTypo(null);
    setDuplicateExists(false);
    setChecking(false);
    blurredOnce.current = false;
    dismissedTypoFor.current = new Set();
    dupCacheRef.current = null;
    dupCallCount.current = 0;
  }, []);

  const forceValidate = useCallback((): boolean => {
    blurredOnce.current = true;
    const fmt = applyFormat(emailValue);
    if (!fmt.valid) {
      setEmailState("invalid");
      setEmailError(fmt.message ?? "Please enter a valid email address");
      setTypo(null);
      return false;
    }
    const lower = emailValue.trim().toLowerCase();
    if (!dismissedTypoFor.current.has(lower)) {
      const typo = detectEmailTypo(lower);
      if (typo.isTypo && typo.suggestedEmail && typo.suggestedDomain) {
        setEmailState("typo_warning");
        setTypo({ suggested: typo.suggestedEmail, domain: typo.suggestedDomain });
        return false;
      }
    }
    if (duplicateExists) {
      setEmailState("invalid");
      setEmailError("An account with this email already exists.");
      return false;
    }
    setEmailState("valid");
    setEmailError(null);
    return true;
  }, [emailValue, applyFormat, duplicateExists]);

  return {
    emailValue,
    emailState,
    emailError,
    emailTypoSuggestion,
    isCheckingDuplicate,
    duplicateExists,
    handleEmailChange,
    handleEmailBlur,
    handleEmailPaste,
    acceptTypoSuggestion,
    dismissTypoWarning,
    resetEmail,
    isEmailValid: emailState === "valid",
    forceValidate,
  };
}
