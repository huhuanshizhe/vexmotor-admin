'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/classnames';

export type ToastTone = 'default' | 'success' | 'error';

export type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  persistent?: boolean;
  actionLabel?: string;
  actionHref?: string;
};

type ToastContextValue = {
  pushToast: (message: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
};

const noopToastContext: ToastContextValue = {
  pushToast: () => {},
  dismissToast: () => {},
};

const ToastContext = createContext<ToastContextValue>(noopToastContext);

function ToastCard({ id, title, description, tone = 'default', persistent = false, actionLabel, actionHref, onDismiss }: ToastMessage & { onDismiss: (id: string) => void }) {
  return (
    <article className={cn('ui-toast', `is-${tone}`)} role={tone === 'error' ? 'alert' : 'status'}>
      <div className="ui-toast-copy">
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
        {actionLabel && actionHref ? (
          <a href={actionHref} className="ui-toast-action">{actionLabel} →</a>
        ) : null}
      </div>
      <button type="button" className="ui-toast-dismiss" onClick={() => onDismiss(id)} aria-label="Dismiss toast">
        {persistent ? 'Dismiss' : 'Close'}
      </button>
    </article>
  );
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const pushToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextMessage: ToastMessage = { id, ...message };

    setMessages((current) => [...current, nextMessage]);

    if (!nextMessage.persistent && nextMessage.tone !== 'error') {
      window.setTimeout(() => {
        setMessages((current) => current.filter((item) => item.id !== id));
      }, 4000);
    }
  }, []);

  const value = useMemo(
    () => ({
      pushToast,
      dismissToast,
    }),
    [dismissToast, pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ui-toast-viewport" aria-live="polite" aria-atomic="true">
        {messages.map((message) => (
          <ToastCard key={message.id} {...message} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}