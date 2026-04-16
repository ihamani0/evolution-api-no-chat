import { BaseChatbotDto, BaseChatbotSettingDto } from '../../base-chatbot.dto';

export class N8nDto extends BaseChatbotDto {
  // N8n specific fields
  webhookUrl?: string;
  basicAuthUser?: string;
  basicAuthPass?: string;
  systemMessage?: string;
  contextWindowSize?: number;
  fallbackMessage?: string;
}

export class N8nSettingDto extends BaseChatbotSettingDto {
  // N8n has no specific fields
}

export class N8nMessageDto {
  chatInput: string;
  systemMessage?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  sessionId: string;
  remoteJid: string;
  pushName: string;
  keyId?: string;
  fromMe?: boolean;
  quotedMessage?: any;
  instanceName: string;
  serverUrl: string;
  apiKey: string;
}
