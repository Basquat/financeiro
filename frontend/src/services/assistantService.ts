import { api } from '@/lib/api';
import type {
  AssistantAction,
  AssistantSettings,
  AssistantSettingsInput,
  ChatAttachment,
  ChatReply,
  ChatTurn,
} from '@/types';

export const assistantService = {
  async settings(): Promise<AssistantSettings> {
    const { data } = await api.get<AssistantSettings>('/assistant/settings');
    return data;
  },

  async saveSettings(input: AssistantSettingsInput): Promise<AssistantSettings> {
    const { data } = await api.put<AssistantSettings>('/assistant/settings', input);
    return data;
  },

  /** Model ids the provider offers; a blank key uses the one already saved. */
  async models(provider: string, apiKey?: string): Promise<string[]> {
    const { data } = await api.post<{ models: string[] }>('/assistant/models', { provider, apiKey });
    return data.models;
  },

  async chat(messages: ChatTurn[], attachment?: ChatAttachment): Promise<ChatReply> {
    const { data } = await api.post<ChatReply>('/assistant/chat', { messages, attachment });
    return data;
  },

  /** Starts the answer on the server; it keeps going if the app is closed. */
  async startChat(messages: ChatTurn[], attachment?: ChatAttachment): Promise<string> {
    const { data } = await api.post<{ id: string }>('/assistant/chat/start', { messages, attachment });
    return data.id;
  },

  /** null while the answer is still being worked on. */
  async chatJob(id: string): Promise<ChatReply | null> {
    const { data } = await api.get<ChatReply & { status?: string }>(`/assistant/chat/${id}`);
    return data.status === 'running' ? null : data;
  },

  async telegramStatus(): Promise<{ enabled: boolean; linked: boolean; botUsername: string }> {
    const { data } = await api.get('/telegram/status');
    return data;
  },

  /** One-time code (10 min) + t.me deep link that sends it to the bot. */
  async telegramLink(): Promise<{ code: string; link: string }> {
    const { data } = await api.post('/telegram/link');
    return data;
  },

  async telegramUnlink(): Promise<void> {
    await api.delete('/telegram/link');
  },

  async execute(action: AssistantAction): Promise<string> {
    const { data } = await api.post<{ message: string }>('/assistant/execute', {
      tool: action.tool,
      args: action.args,
    });
    return data.message;
  },
};
