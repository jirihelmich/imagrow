import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdleTimer } from 'react-idle-timer';
import { useAuth } from '../contexts/AuthContext';

const TIMEOUT_MS = 60 * 60 * 1000;
const PROMPT_BEFORE_IDLE_MS = 10 * 60 * 1000;

export interface IdleState {
  promptOpen: boolean;
  remainingMs: number;
  dismiss: () => void;
}

export function useIdleLogout(): IdleState {
  const { signOut, currentUser } = useAuth();
  const navigate = useNavigate();
  const [promptOpen, setPromptOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const idleRef = useRef<ReturnType<typeof useIdleTimer> | null>(null);

  const idle = useIdleTimer({
    timeout: TIMEOUT_MS,
    promptBeforeIdle: PROMPT_BEFORE_IDLE_MS,
    onPrompt: () => {
      setPromptOpen(true);
      setRemainingMs(PROMPT_BEFORE_IDLE_MS);
    },
    onIdle: () => {
      setPromptOpen(false);
      if (currentUser) {
        signOut();
        navigate('/login', { replace: true });
      }
    },
    onActive: () => {
      setPromptOpen(false);
    },
    disabled: !currentUser,
  });

  idleRef.current = idle;

  useEffect(() => {
    if (!promptOpen) return;
    const id = setInterval(() => {
      const ms = idleRef.current?.getRemainingTime() ?? 0;
      setRemainingMs(ms);
    }, 1000);
    return () => clearInterval(id);
  }, [promptOpen]);

  const dismiss = () => {
    idle.activate();
    setPromptOpen(false);
  };

  return { promptOpen, remainingMs, dismiss };
}
