import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIMode, Language, Attachment, WorkspaceFile } from '../src/types';

const {
  storageMap,
  mockGenerateStream,
  mockGenerateResponse,
  mockGetSystemPrompt,
} = vi.hoisted(() => {
  const storageMap = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => storageMap.get(k) ?? null,
    setItem: (k: string, v: string) => { storageMap.set(k, v); },
    removeItem: (k: string) => { storageMap.delete(k); },
    clear: () => { storageMap.clear(); },
  };
  return {
    storageMap,
    mockGenerateStream: vi.fn(),
    mockGenerateResponse: vi.fn(),
    mockGetSystemPrompt: vi.fn(
      (mode: AIMode, language: Language, _profile: string, summary: string, _isEcoMode?: boolean, _iqLevel?: number) =>
        `SYSTEM[${mode}|${language}]\n${summary}`
    ),
  };
});

vi.mock('@/lib/neuralBridge', () => ({
  MasterNeuralNetworkBridge: class {
    generateStream = mockGenerateStream;
    generateResponse = mockGenerateResponse;
  },
  getSystemPrompt: (
    mode: AIMode,
    language: Language,
    profile: string,
    summary: string,
    isEcoMode: boolean,
    iqLevel: number
  ) => mockGetSystemPrompt(mode, language, profile, summary, isEcoMode, iqLevel),
}));

import {
  brain,
  clearChatMemory,
  getMemoryData,
  deleteMemoryNode,
  tagMemoryNode,
  sendMessageStream,
  translateMessage,
} from '../src/masterBrainService';

async function collectStream<T>(gen: AsyncGenerator<T>) {
  const items: T[] = [];
  for await (const chunk of gen) {
    items.push(chunk);
  }
  return items;
}

describe('masterBrainService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMap.clear();
    clearChatMemory();
  });

  describe('memory management helpers', () => {
    it('returns memory nodes and stats via getMemoryData and clears cleanly', () => {
      brain.addMessage('user', 'hello');
      const data = getMemoryData();
      expect(Array.isArray(data.nodes)).toBe(true);
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.totalNodes).toBe('number');

      clearChatMemory();
      expect(brain.getContext().recent).toHaveLength(0);
    });

    it('tags and deletes a memory node safely', () => {
      const node = {
        id: 'node-1',
        category: 'Technical',
        difficulty: 'medium' as const,
        content: 'Sample learned knowledge',
        tags: ['ts'],
        timestamp: Date.now(),
        confidence: 0.9,
      };
      (brain as any).memoryNodes.push(node);

      tagMemoryNode('node-1', 'vitest');
      expect(brain.getMemoryNodes().find(n => n.id === 'node-1')?.tags).toContain('vitest');

      deleteMemoryNode('node-1');
      expect(brain.getMemoryNodes().find(n => n.id === 'node-1')).toBeUndefined();
    });
  });

  describe('sendMessageStream', () => {
    it('streams chunks, passes systemInstruction, and records assistant reply in brain', async () => {
      mockGenerateStream.mockImplementation(async function* () {
        yield { text: 'Hello ', thought: 'thinking...', sources: [{ title: 'Docs', uri: 'https://example.com' }] };
        yield { text: 'world!', thought: '', sources: [] };
      });

      const chunks = await collectStream(
        sendMessageStream('Hi there', [], AIMode.CHAT, Language.ENGLISH)
      );

      expect(chunks).toHaveLength(3);
      expect(chunks[0].text).toBe('Hello ');
      expect(chunks[0].thought).toBe('thinking...');
      expect(chunks[1].text).toBe('world!');
      expect(chunks[2].terminalLogs?.[0]?.message).toContain('[SOURCE: CLOUD_API]');

      const recent = brain.getContext().recent;
      expect(recent.some(m => m.role === 'user' && m.content === 'Hi there')).toBe(true);
      expect(recent.some(m => m.role === 'assistant' && m.content === 'Hello world!')).toBe(true);
    });

    it('injects owner identity when username belongs to TMkingreal / king', async () => {
      mockGenerateStream.mockImplementation(async function* () {
        yield { text: 'Yes owner', thought: '', sources: [] };
      });

      await collectStream(
        sendMessageStream('Who am I?', [], AIMode.CHAT, Language.VIETNAMESE, [], undefined, false, 'gemini-3-flash-preview', true, 'TMkingreal')
      );

      const summaryArg = mockGetSystemPrompt.mock.calls[0][3];
      expect(summaryArg).toContain('[XÁC THỰC CHỦ SỞ HỮU]');
      expect(summaryArg).toContain('TMkingreal');
    });

    it('injects workspace tree, code contents, and asset references into context', async () => {
      mockGenerateStream.mockImplementation(async function* () {
        yield { text: 'FILENAME: src/App.tsx\n```tsx\nexport default () => null;\n```', thought: '', sources: [] };
      });

      const workspace: WorkspaceFile[] = [
        { path: 'package.json', name: 'package.json', mimeType: 'application/json', size: 20, content: '{"name":"demo"}', isBinary: false },
        { path: 'src/App.tsx', name: 'App.tsx', mimeType: 'text/typescript', size: 30, content: 'export default function App(){}', isBinary: false },
        { path: 'asset/logo.png', name: 'logo.png', mimeType: 'image/png', size: 100, dataUrl: 'data:image/png;base64,AA==', isBinary: true },
      ];

      await collectStream(
        sendMessageStream('Fix App.tsx', [], AIMode.APP_PREVIEW, Language.VIETNAMESE, [], undefined, false, 'gemini-3-flash-preview', true, undefined, workspace, 'demo-app')
      );

      const summaryArg = mockGetSystemPrompt.mock.calls[0][3];
      expect(summaryArg).toContain('[THƯ MỤC DỰ ÁN WORKSPACE HIỆN TẠI: demo-app (3 tệp)]');
      expect(summaryArg).toContain('--- FILE: src/App.tsx ---');
      expect(summaryArg).toContain('asset/logo.png');
      expect(summaryArg).toContain('FILENAME: duong_dan/file.ext');
    });

    it('sends multimodal inlineData for images and inlines text file content into user parts', async () => {
      mockGenerateStream.mockImplementation(async function* () {
        yield { text: 'Processed', thought: '', sources: [] };
      });

      const attachments: Attachment[] = [
        { id: 'img1', name: 'shot.png', type: 'image', mimeType: 'image/png', data: 'QUJD', size: 120 },
        { id: 'txt1', name: 'notes.ts', type: 'file', mimeType: 'text/plain', data: '', textContent: 'const x = 1;', size: 512 },
      ];

      await collectStream(
        sendMessageStream('Inspect attachments', [], AIMode.CODE, Language.ENGLISH, attachments)
      );

      const [contents] = mockGenerateStream.mock.calls[0];
      const lastMsg = contents[contents.length - 1];
      expect(lastMsg.role).toBe('user');
      expect(lastMsg.parts.some((p: any) => p.inlineData?.mimeType === 'image/png')).toBe(true);
      expect(lastMsg.parts[0].text).toContain('const x = 1;');
      expect(lastMsg.parts[0].text).toContain('IMAGE_ID');
    });

    it('applies eco-mode history pruning without duplicating the active user message', async () => {
      for (let i = 1; i <= 8; i++) {
        brain.addMessage('user', `u${i}`);
        brain.addMessage('assistant', `a${i}`);
      }

      mockGenerateStream.mockImplementation(async function* () {
        yield { text: 'ok', thought: '', sources: [] };
      });

      await collectStream(
        sendMessageStream('final question', [], AIMode.FAST, Language.ENGLISH, [], undefined, true)
      );

      const [contents] = mockGenerateStream.mock.calls[0];
      expect(contents.length).toBeLessThanOrEqual(4);
      const userCount = contents.filter((c: any) => c.parts[0].text.includes('final question')).length;
      expect(userCount).toBe(1);
    });

    it('gracefully yields overload warning on 429 / RESOURCE_EXHAUSTED quota error', async () => {
      mockGenerateStream.mockImplementation(async function* () {
        throw Object.assign(new Error('429 RESOURCE_EXHAUSTED'), { code: 429 });
      });

      const chunks = await collectStream(
        sendMessageStream('Trigger quota', [], AIMode.CHAT, Language.VIETNAMESE)
      );

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toContain('Quota Exceeded');
      expect(chunks[0].terminalLogs?.[0]?.type).toBe('error');
    });

    it('rethrows non-quota fatal errors', async () => {
      mockGenerateStream.mockImplementation(async function* () {
        throw new Error('Network unreachable');
      });

      await expect(
        collectStream(sendMessageStream('Fail', [], AIMode.CHAT, Language.ENGLISH))
      ).rejects.toThrow('Network unreachable');
    });
  });

  describe('translateMessage', () => {
    it('returns translated text from API response', async () => {
      mockGenerateResponse.mockResolvedValue({ text: 'Xin chào thế giới' });
      const out = await translateMessage('Hello world', Language.VIETNAMESE);
      expect(out).toBe('Xin chào thế giới');
    });

    it('falls back to original text if translation fails', async () => {
      mockGenerateResponse.mockRejectedValue(new Error('API error'));
      const out = await translateMessage('Original content', Language.FRENCH);
      expect(out).toBe('Original content');
    });
  });
});
