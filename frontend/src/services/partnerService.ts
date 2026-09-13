import { api } from '@/lib/api';
import type { UserSummary } from '@/types';

export interface PartnerStatus {
  partner: UserSummary | null;
  invite: { code: string; expiresAt: string } | null;
}

export const partnerService = {
  async status(): Promise<PartnerStatus> {
    const { data } = await api.get<PartnerStatus>('/partner');
    return data;
  },
  async createInvite(): Promise<{ code: string; expiresAt: string }> {
    const { data } = await api.post<{ code: string; expiresAt: string }>('/partner/invite');
    return data;
  },
  async revokeInvite(): Promise<void> {
    await api.delete('/partner/invite');
  },
  async accept(code: string): Promise<{ partner: UserSummary; message: string }> {
    const { data } = await api.post<{ partner: UserSummary; message: string }>('/partner/accept', {
      code,
    });
    return data;
  },
  async dissolve(): Promise<void> {
    await api.delete('/partner');
  },
};
