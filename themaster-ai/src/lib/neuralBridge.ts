import { AIMode, Language } from "@/types";

export function getSystemPrompt(mode: AIMode, language: Language, profile: string, summary: string, isEcoMode: boolean, iqLevel: number = 1) {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
  const dateUS = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateVN = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeNow = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  let prompt = `BẢN SẮC: Bạn là TheMaster — trợ lý thông minh, tự nhiên, chính xác và phản hồi nhanh gọn.
THỜI GIAN HỆ THỐNG CHÍNH XÁC HIỆN TẠI:
- Ngày (MM/DD/YYYY): ${dateUS}
- Ngày đầy đủ: ${dateVN}
- Giờ hiện tại: ${timeNow} (${timeZone})
- ISO: ${now.toISOString()}
Khi người dùng hỏi về ngày, giờ, năm hiện tại hoặc thông tin thời sự, LUÔN dùng chính xác mốc thời gian trên (${dateUS}, ${timeNow}) và tuyệt đối không bịa đặt.

GIAO TIẾP & BẢO MẬT CHỦ SỞ HỮU:
- Trả lời tự nhiên, đi thẳng vào trọng tâm, súc tích, không sáo rỗng hay lặp khuôn máy móc.
- Chủ sở hữu & người sáng tạo duy nhất của TheMaster là **TMkingreal** (cũng có thể gọi là **king**).
- QUY TẮC BẢO MẬT TUYỆT ĐỐI: KHÔNG BAO GIỜ tiết lộ tên thật, tuổi, năm sinh, ngày sinh, nơi ở, trường học, email hay thông tin cá nhân của chủ sở hữu. Khi được hỏi về chủ sở hữu/người tạo ra bạn, CHỈ được nói là **TMkingreal** (hoặc **king**).
- LUÔN suy nghĩ (luồng suy luận) và trả lời bằng ngôn ngữ được chọn: ${language}.

NĂNG LỰC LẬP TRÌNH CHUYÊN SÂU:
- Viết mã nguồn hoàn chỉnh, chạy được ngay, chuẩn xác từng import/type/edge-case, kiến trúc module sạch sẽ, không bỏ dở hay viết placeholder // TODO trừ khi được yêu cầu.
- Tên biến theo camelCase, hạn chế comment thừa, ưu tiên hiệu năng, bảo mật và clean architecture.

QUY CHUẨN TẠO FILE & CÂY THƯ MỤC (HỆ THỐNG TỰ ĐỘNG ĐÓNG GÓI TẢI VỀ):
1. TẠO FILE WORD (.docx):
   Viết dòng FILENAME: ten_tai_lieu.docx ngay trước khối mã \`\`\`markdown ... \`\`\` chứa nội dung trình bày đầy đủ (tiêu đề #, ##, ###, danh sách, bảng).
   CHÈN ẢNH VÀO WORD: Nếu người dùng gửi ảnh (có IMAGE_ID dạng attach://...) hoặc gửi link ảnh (https://...), hãy chèn trực tiếp vào nội dung markdown bằng cú pháp \`![Mô tả ảnh](url_hoặc_attach://id)\`. Hệ thống sẽ tự động nhúng ảnh thật vào file .docx.
2. TẠO FILE POWERPOINT (.pptx):
   Viết dòng FILENAME: ten_trinh_chieu.pptx ngay trước khối mã \`\`\`pptx ... \`\`\` chứa JSON hợp lệ theo cấu trúc:
   {"title":"Tiêu đề chính","subtitle":"Phụ đề","slides":[{"title":"Tiêu đề slide","bullets":["Ý 1","Ý 2"],"image":"url_hoặc_attach://id","notes":"Ghi chú"}]}
   CHÈN ẢNH VÀO SLIDE: Thêm trường "image" (tùy chọn) với đường dẫn link ảnh người dùng gửi hoặc attach://id của ảnh đính kèm để hệ thống nhúng ảnh trực tiếp vào slide .pptx và xem trước.
3. TẠO FILE PDF (.pdf):
   Viết dòng FILENAME: ten_tai_lieu.pdf ngay trước khối mã \`\`\`markdown ... \`\`\` chứa nội dung.
4. TỰ ĐỘNG SỬA CODE VÀO FOLDER & TẢI ZIP (.zip):
   Khi người dùng có folder dự án đang mở và yêu cầu sửa lỗi, viết lại, hoặc thêm tệp, hãy tự đọc kỹ mã nguồn các tệp liên quan trong folder, đặt dòng FILENAME: duong_dan/ten_file.ext (khớp đúng đường dẫn trong folder) ngay trước MỖI khối mã \`\`\`lang ... \`\`\` (ví dụ FILENAME: src/App.tsx). Viết đầy đủ toàn bộ mã file hoàn chỉnh (không cắt bớt // ...) để hệ thống TỰ ĐỘNG ghi đè thẳng vào folder và build lại ngay.
5. VẼ CÂY THƯ MỤC (DIRECTORY TREE):
   Khi người dùng gửi thư mục hoặc yêu cầu vẽ cây thư mục / cấu trúc dự án, LUÔN đặt cây thư mục trong khối mã ngôn ngữ \`\`\`tree ... \`\`\` sử dụng ký tự chuẩn ├── , └── , │   để hệ thống hiển thị trong khung cây thư mục chuyên dụng.
6. GỢI Ý BƯỚC TIẾP THEO:
   Ở dòng cuối cùng của phản hồi, thêm đúng 1 dòng theo định dạng:
   [SUGGESTIONS: gợi ý 1 | gợi ý 2 | gợi ý 3]
   Mỗi gợi ý dài tối đa 8 từ, đúng ngữ cảnh việc nên làm tiếp theo (VD: chạy thử code, cập nhật file vào folder, xuất tài liệu, tối ưu hiệu năng) và viết bằng ngôn ngữ ${language}.

[NGỮ CẢNH HỘI THOẠI]:
${summary}`;

  if (mode === AIMode.CODE) prompt += "\n\nChế độ Code: Ưu tiên kiến trúc kỹ thuật chuẩn production, giải thích ngắn gọn và code hoàn chỉnh 100%.";
  if (mode === AIMode.APP_PREVIEW) prompt += "\n\nChế độ Chạy thử App (App Runner): Bạn là kỹ sư phát triển ứng dụng tương tác đa ngôn ngữ & đa framework (React + TypeScript + framer-motion/lucide-react/canvas-confetti, Vue 3 .vue SFC, HTML/CSS/TypeScript, Java đa tệp .java, C/C++ đa tệp .cpp/.h, Python đa module .py, Browser Extension MV3, Minecraft Fabric Mod gồm build.gradle + fabric.mod.json + Screen.java dùng ButtonWidget/CheckboxWidget/SliderWidget/TextFieldWidget để preview GUI Fabric & ./gradlew build, GLSL Shader .frag, và Brainfuck .bf). Khi tạo hoặc sửa dự án, luôn thiết kế giao diện tối giản, trả về mã nguồn đầy đủ từng file kèm FILENAME: duong_dan/file.ext để hệ thống tự động áp dụng vào folder và build/run ngay.";
  if (mode === AIMode.DEEP) prompt += "\n\nChế độ Phân tích sâu: Lập luận chặt chẽ, đa chiều, chính xác.";
  if (mode === AIMode.RESEARCH) prompt += "\n\nChế độ Nghiên cứu: Xác minh dữ liệu thực tế chính xác theo thời gian hiện tại.";
  return prompt;
}

export class MasterNeuralNetworkBridge {
  async *generateStream(contents: any[], config: any, mode: AIMode, signal?: AbortSignal, model: string = 'gemini-3-flash-preview', language: string = 'Vietnamese') {
    let response: Response;
    try {
      response = await fetch('/api/v2/kernel/neural-matrix-compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, config, mode, model, language }),
        signal
      });
    } catch (networkErr: any) {
      if (networkErr?.name === 'AbortError') throw networkErr;
      throw new Error(networkErr?.message || 'Không thể kết nối tới máy chủ API (/api/v2/kernel/neural-matrix-compute).');
    }

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText.trim();
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error || json.message || parsedErr;
      } catch (_) {
        if (parsedErr.startsWith('<')) {
          parsedErr = '';
        }
      }
      throw new Error(parsedErr || `HTTP ${response.status} (${response.statusText || 'API Server Error'})`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Không thể khởi tạo luồng phản hồi.");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let receivedOutput = false;

    const parseSseLine = (rawLine: string): { done?: boolean; error?: string; text?: string; thought?: string; sources?: any[] } | null => {
      const trimmed = rawLine.trim();
      if (!trimmed.startsWith("data:")) return null;
      const jsonStr = trimmed.slice(5).trim();
      if (!jsonStr) return null;
      if (jsonStr === "[DONE]") return { done: true };
      try {
        const data = JSON.parse(jsonStr);
        if (data?.error) {
          return { error: String(data.error) };
        }
        return {
          text: data.text || '',
          thought: data.thought || '',
          sources: data.sources || []
        };
      } catch (e) {
        console.error("Lỗi parse dữ liệu luồng:", trimmed, e);
        return null;
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || "";

        for (const line of lines) {
          const parsed = parseSseLine(line);
          if (!parsed) continue;
          if (parsed.done) {
            if (!receivedOutput) {
              throw new Error("Máy chủ đã đóng luồng nhưng không trả về nội dung phản hồi.");
            }
            return;
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text || parsed.thought || (parsed.sources && parsed.sources.length > 0)) {
            receivedOutput = true;
          }
          yield {
            text: parsed.text || '',
            thought: parsed.thought || '',
            sources: parsed.sources || []
          };
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) {
        const trailingLines = buffer.split(/\r?\n/);
        for (const line of trailingLines) {
          const parsed = parseSseLine(line);
          if (!parsed) continue;
          if (parsed.done) {
            if (!receivedOutput) {
              throw new Error("Máy chủ đã đóng luồng nhưng không trả về nội dung phản hồi.");
            }
            return;
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
          if (parsed.text || parsed.thought || (parsed.sources && parsed.sources.length > 0)) {
            receivedOutput = true;
          }
          yield {
            text: parsed.text || '',
            thought: parsed.thought || '',
            sources: parsed.sources || []
          };
        }
      }

      if (!receivedOutput) {
        throw new Error("Luồng phản hồi kết thúc mà không có dữ liệu từ API.");
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateResponse(contents: any[], config: any, mode: AIMode, model: string = 'gemini-3-flash-preview') {
    let response: Response;
    try {
      response = await fetch('/api/v2/kernel/cognitive-tensor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, config, mode, model })
      });
    } catch (networkErr: any) {
      throw new Error(networkErr?.message || 'Không thể kết nối tới máy chủ API (/api/v2/kernel/cognitive-tensor).');
    }

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText.trim();
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error || json.message || parsedErr;
      } catch (_) {
        if (parsedErr.startsWith('<')) {
          parsedErr = '';
        }
      }
      throw new Error(parsedErr || `HTTP ${response.status} (${response.statusText || 'API Server Error'})`);
    }

    return await response.json();
  }
}
