
import { TheMasterCore } from "@/lib/shadowBrain";
import { MasterNeuralNetworkBridge, getSystemPrompt } from "@/lib/neuralBridge";
import { AIMode, Language, Message, Attachment, GroundingSource, WorkspaceFile } from "@/types";
import { buildAsciiTreeFromPaths } from "@/lib/fileGenerator";

export const brain = new TheMasterCore();
const client = new MasterNeuralNetworkBridge();

export function clearChatMemory() {
  brain.clear();
}

export function getMemoryData() {
  return {
    nodes: brain.getMemoryNodes(),
    stats: brain.getContext().memoryStats
  };
}

export function deleteMemoryNode(id: string) {
  brain.deleteNode(id);
}

export function tagMemoryNode(id: string, tag: string) {
  brain.tagNode(id, tag);
}

export async function* sendMessageStream(
  message: string,
  history: Message[],
  mode: AIMode,
  language: Language,
  attachments: Attachment[] = [],
  signal?: AbortSignal,
  isEcoMode: boolean = false,
  model: string = 'gemini-3-flash-preview',
  _isApiOnline: boolean = true,
  username?: string,
  workspaceFiles: WorkspaceFile[] = [],
  workspaceName: string = 'project'
) {
  brain.addMessage("user", message);
  const context = brain.getContext();
  let enhancedContext = context.summary;

  // Identify if User is Owner TMkingreal / king
  if (username) {
    const norm = username.toLowerCase();
    if (norm.includes("kingreal") || norm.includes("tm_") || norm === "king") {
      enhancedContext += `\n\n[XÁC THỰC CHỦ SỞ HỮU]: Người dùng đang trò chuyện là TMkingreal (king), người sáng tạo ra TheMaster.`;
    }
  }

  const currentIQ = brain.getCognitiveLevel();

  // Collect any previously uploaded images in history so AI can embed them in docx/pptx across turns
  const historyImages: { id: string; name: string }[] = [];
  for (const h of history) {
    if (h.attachments) {
      for (const att of h.attachments) {
        if (att.type === 'image' && att.data) {
          historyImages.push({ id: att.id, name: att.name });
        }
      }
    }
  }
  if (historyImages.length > 0) {
    enhancedContext += `\n[ẢNH ĐÃ ĐÍNH KÈM TRONG HỘI THOẠI (dùng để chèn vào DOCX/PPTX nếu cần)]:\n` +
      historyImages.map((img, i) => `- Ảnh #${i + 1}: "${img.name}" -> IMAGE_ID: attach://${img.id}`).join('\n');
  }

  if (workspaceFiles && workspaceFiles.length > 0) {
    const projectTree = buildAsciiTreeFromPaths(workspaceFiles.map(f => f.path), workspaceName || 'project');
    const assetItems = workspaceFiles.filter(f => f.dataUrl || f.mimeType?.startsWith('image/'));
    const textFiles = workspaceFiles.filter(f => !f.isBinary && typeof f.content === 'string');

    enhancedContext += `\n\n[THƯ MỤC DỰ ÁN WORKSPACE HIỆN TẠI: ${workspaceName || 'project'} (${workspaceFiles.length} tệp)]:\n${projectTree}`;
    if (assetItems.length > 0) {
      enhancedContext += `\n\n[ẢNH TRONG THƯ MỤC ASSET (dùng đường dẫn này trong code HTML/React hoặc DOCX/PPTX)]:\n` +
        assetItems.map(a => `- ${a.path}`).join('\n');
    }

    let charBudget = 75000;
    const priorityScore = (p: string) => {
      const l = p.toLowerCase();
      if (
        l === 'manifest.json' ||
        l.endsWith('/manifest.json') ||
        l === 'package.json' ||
        l === 'index.html' ||
        l === 'build.gradle' ||
        l === 'build.gradle.kts' ||
        l === 'gradle.properties' ||
        l.endsWith('/fabric.mod.json')
      ) return 0;
      if (
        /^(src\/)?(main|app|popup|content|background|options|sidepanel)\.(tsx|jsx|ts|js|vue|html|py)$/i.test(l) ||
        /screen\.(java|kt)$/i.test(l) ||
        /lang\/.*\.json$/i.test(l) ||
        /\.(frag|glsl|bf)$/i.test(l)
      ) return 1;
      return 2;
    };
    const sortedCode = [...textFiles].sort((a, b) => priorityScore(a.path) - priorityScore(b.path));
    enhancedContext += `\n\n[NỘI DUNG MÃ NGUỒN TRONG THƯ MỤC DỰ ÁN]:\n`;
    for (const file of sortedCode) {
      const snippet = (file.content || '').slice(0, 20000);
      if (charBudget - snippet.length < 0 && enhancedContext.length > 80000) break;
      charBudget -= snippet.length;
      enhancedContext += `\n--- FILE: ${file.path} ---\n\`\`\`\n${snippet}\n\`\`\`\n`;
    }
    enhancedContext += `\n(QUY TẮC TỰ LỤC CODE & FIX TRỰC TIẾP VÀO FOLDER: Khi người dùng yêu cầu sửa lỗi, tối ưu, viết lại hoặc thêm file trong dự án trên, hãy tự kiểm tra toàn bộ cây thư mục và nội dung từng tệp, xác định nguyên nhân/chỗ cần sửa, và LUÔN xuất đầy đủ nội dung tệp mới kèm dòng \`FILENAME: duong_dan/file.ext\` khớp đúng đường dẫn trong thư mục ngay trước khối code. Hệ thống sẽ tự động ghi thẳng vào folder và build lại.)`;
  }

  const systemInstruction = getSystemPrompt(mode, language, context.profile, enhancedContext, isEcoMode, currentIQ);

  const userParts: any[] = [{ text: message }];
  attachments.forEach(att => {
    const isNativeMultimodal =
      Boolean(att.data && att.mimeType) && (
        att.type === 'image' ||
        att.mimeType === 'application/pdf' ||
        att.mimeType?.startsWith('audio/')
      );

    if (isNativeMultimodal) {
      userParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      
      // If it also has text extracted (sometimes user uploads PDF that we can also attach metadata), we log it
      if (att.textContent) {
        userParts[0].text += `\n\n[Tệp Tài Liệu: ${att.name}]\n${att.textContent}`;
      } else if (att.type === 'image') {
        userParts[0].text += `\n\n[Đã đính kèm ảnh: "${att.name}" | IMAGE_ID để chèn vào DOCX/PPTX: attach://${att.id}]`;
      } else {
        userParts[0].text += `\n\n[Đã đính kèm tệp phương tiện đa phương thức: ${att.name}]`;
      }
    } else {
      // For source code, text files and other document configurations
      userParts[0].text += `\n\n--- DỮ LIỆU TỆP ĐÍNH KÈM SẴN CÓ ---`;
      userParts[0].text += `\n- Tên tệp: ${att.name}`;
      userParts[0].text += `\n- Loại nội dung: ${att.mimeType || 'unknown'}`;
      userParts[0].text += `\n- Kích thước: ${(att.size / 1024).toFixed(1)} KB`;
      if (att.textContent) {
        userParts[0].text += `\n- Nội dung tệp thực tế:\n\`\`\`\n${att.textContent}\n\`\`\``;
      }
      userParts[0].text += `\n---------------------------------------`;
    }
  });

  // Context Pruning (exclude the just-added trailing user message to avoid duplication)
  const historyLimit = isEcoMode ? -4 : -20;
  const priorHistory = context.recent.slice(historyLimit, -1);

  const contents: any[] = [];
  for (const msg of priorHistory) {
    const role = msg.role === 'user' ? 'user' : 'model';
    const text = (msg.content || '').trim();
    if (!text) continue;
    const prev = contents[contents.length - 1];
    if (prev && prev.role === role) {
      prev.parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  const prevLast = contents[contents.length - 1];
  if (prevLast && prevLast.role === 'user' && attachments.length === 0) {
    prevLast.parts[0].text += `\n\n${userParts[0].text}`;
  } else {
    contents.push({
      role: 'user',
      parts: userParts
    });
  }

  let fullAssistantResponse = "";
  const logs: any[] = [];
  try {
    const config: any = { 
      systemInstruction
    };
    
    const stream = client.generateStream(contents, config, mode, signal, model, language);

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      
      const { text, thought, sources } = chunk;
      fullAssistantResponse += text;

      yield { 
        text, 
        thought, 
        sources,
        terminalLogs: [] 
      };
    }

    logs.length = 0;
    logs.push({ message: `[SOURCE: CLOUD_API] Data stream via TheMaster.`, type: 'info' });

    if (fullAssistantResponse.trim()) {
      brain.addMessage("assistant", fullAssistantResponse);
    }

    yield { 
      text: "", 
      isLearned: false,
      isUsedLocal: false,
      terminalLogs: logs
    };

  } catch (error: any) {
    const errMsg = String(error?.message || '');
    if (error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED' || error.code === 429 || errMsg.includes('429')) {
      logs.push({ message: `[QUOTA EXCEEDED] API limit reached.`, type: 'error' as any });
      const overloadMessage = `⚠️ **AI Đang Quá Tải (Quota Exceeded)**\n\nHệ thống hiện đang gặp giới hạn tải tối đa từ máy chủ (Rate Limit). Vui lòng thử lại sau ít phút.`;
      yield { text: overloadMessage, terminalLogs: logs as any };
      return;
    }

    if (error.code === 503 || error.status === 'UNAVAILABLE' || /503|high demand|quá tải tạm thời|unavailable/i.test(errMsg)) {
      logs.push({ message: `[503 UNAVAILABLE] High demand on upstream model.`, type: 'error' as any });
      const busyMessage = `⚠️ **Máy chủ AI đang có lượng truy cập cao tạm thời (503)**\n\nHệ thống đã tự động thử kết nối lại nhưng hiện tại phản hồi vẫn bị nghẽn. Vui lòng thử gửi lại sau vài giây.`;
      yield { text: busyMessage, terminalLogs: logs as any };
      return;
    }

    console.error("TheMaster Core Fatal Error:", error);
    throw error;
  }
}

/**
 * Sends a message stream to the AI and processes memory updates.
 * 
 * @example
 * // Basic Chat
 * for await (const chunk of sendMessageStream("Hello", [], AIMode.CHAT, Language.VIETNAMESE)) {
 *   console.log(chunk.text);
 * }
 * 
 * @example
 * // Research mode with English output
 * for await (const chunk of sendMessageStream("Analyze this", [], AIMode.RESEARCH, Language.ENGLISH)) {
 *   if (chunk.sources) console.log(chunk.sources);
 * }
 * 
 * @example 
 * // Programming aid
 * for await (const chunk of sendMessageStream("Write a python script", [], AIMode.CODE, Language.ENGLISH)) {
 *   // Response will contain syntax-highlighted code blocks
 * }
 */
export async function translateMessage(content: string, targetLanguage: Language): Promise<string> {
  const systemInstruction = "TheMaster Translation Core. Precise. Professional.";
  const contents = [{
    role: 'user',
    parts: [{ text: `Translate following content to ${targetLanguage}. Maintain technical formatting:\n\n${content}` }]
  }];

  try {
    const response = await client.generateResponse(contents, { systemInstruction }, AIMode.FAST);
    return response.text || content;
  } catch {
    return content;
  }
}
