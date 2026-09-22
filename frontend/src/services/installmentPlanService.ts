import { api } from '@/lib/api';
import type { InstallmentPlan, InstallmentPlanInput } from '@/types';

export const installmentPlanService = {
  async list(userId: number): Promise<InstallmentPlan[]> {
    const { data } = await api.get<InstallmentPlan[]>(`/installment-plans/user/${userId}`);
    return data;
  },

  async create(input: InstallmentPlanInput): Promise<InstallmentPlan> {
    const { data } = await api.post<InstallmentPlan>('/installment-plans', input);
    return data;
  },

  async update(id: number, input: InstallmentPlanInput): Promise<InstallmentPlan> {
    const { data } = await api.put<InstallmentPlan>(`/installment-plans/${id}`, input);
    return data;
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/installment-plans/${id}`);
  },

  async pay(id: number, accountId?: number): Promise<InstallmentPlan> {
    const { data } = await api.post<InstallmentPlan>(
      `/installment-plans/${id}/pay`,
      null,
      accountId ? { params: { accountId } } : undefined,
    );
    return data;
  },
};
