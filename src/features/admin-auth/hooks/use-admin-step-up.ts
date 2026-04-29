"use client";

import {
  clearAdminStepUp,
  readAdminStepUp,
  subscribeToAdminStepUp,
  type StoredAdminStepUp,
} from "@/lib/auth/admin-step-up";
import { useEffect, useMemo, useState } from "react";

export function useAdminStepUp() {
  const [stepUp, setStepUp] = useState<StoredAdminStepUp | null>(() => readAdminStepUp());
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    const sync = () => {
      setStepUp(readAdminStepUp());
      setNowMs(Date.now());
    };
    const unsubscribe = subscribeToAdminStepUp(sync);
    sync();
    const interval = window.setInterval(sync, 30_000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  const isActive = useMemo(() => {
    if (!stepUp) {
      return false;
    }

    return Date.parse(stepUp.expiresAt) > nowMs;
  }, [nowMs, stepUp]);

  return {
    stepUp,
    isActive,
    clear: clearAdminStepUp,
  };
}
