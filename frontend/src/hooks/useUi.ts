import { create } from 'zustand';

export type ModalName =
  | 'add-sheet'
  | 'transaction'
  | 'installment'
  | 'goal'
  | 'account'
  | 'contribute'
  | 'pay-installment'
  | 'salary'
  | 'email'
  | 'avatar'
  | 'partner'
  | null;

export interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface UiState {
  modal: ModalName;
  /** Entity being edited / acted on (Transaction, SharedGoal, InstallmentPlan, Account…). */
  payload: unknown;
  confirm: ConfirmRequest | null;
  open: (modal: Exclude<ModalName, null>, payload?: unknown) => void;
  close: () => void;
  askConfirm: (request: ConfirmRequest) => void;
  clearConfirm: () => void;
}

export const useUi = create<UiState>((set) => ({
  modal: null,
  payload: null,
  confirm: null,
  open: (modal, payload = null) => set({ modal, payload }),
  close: () => set({ modal: null, payload: null }),
  askConfirm: (confirm) => set({ confirm }),
  clearConfirm: () => set({ confirm: null }),
}));
