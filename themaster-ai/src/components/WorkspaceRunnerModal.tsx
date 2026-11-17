import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderOpen,
  Folder,
  ImagePlus,
  Play,
  RotateCw,
  Monitor,
  Smartphone,
  Trash2,
  X,
  FileCode2,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  Terminal,
  Plus,
  Archive,
  Send,
  HardDriveDownload,
  Layers,
  Code2,
  ChevronRight,
  ChevronDown,
  Wrench,
  Database,
  Edit3,
  User as UserIcon,
} from 'lucide-react';
import { Theme, TranslationStrings, WorkspaceFile } from '../types';
import { buildAsciiTreeFromPaths, downloadZipFromFiles, triggerBlobDownload } from '../lib/fileGenerator';
import {
  buildWorkspaceProject,
  isAssetPath,
  isMediaPath,
  runWorkspaceBuildCheck,
  WORKSPACE_TEMPLATES,
  WorkspaceTemplate,
} from '../lib/workspaceBuilder';
import { SavedWorkspaceFolder } from '../lib/folderVault';
import { buildPythonStdinPreamble, runCppProject, runJavaProject } from '../lib/polyglotRunner';
import { getPyodideRuntime } from './MarkdownRenderer';

interface WorkspaceRunnerModalProps {
  isOpen: boolean;
  theme: Theme;
  t: TranslationStrings;
  workspaceName: string;
  files: WorkspaceFile[];
  onClose: () => void;
  onLoadFolderFiles: (files: WorkspaceFile[], folderName: string) => void;
  onAddAssets: (assets: WorkspaceFile[]) => void;
  onUpdateFile: (path: string, content: string) => void;
  onDeleteFile: (path: string) => void;
  onClearWorkspace: () => void;
  onSaveToDisk?: () => Promise<boolean>;
  onAskAiAboutError?: (promptText: string) => void;
  onAutoFixWorkspace?: (
    instruction: string,
    consoleContext?: string,
    onProgress?: (line: string) => void
  ) => Promise<string[]>;
  autoRunSignal?: number;
  user?: { email?: string; username?: string } | null;
  vaultFolders?: SavedWorkspaceFolder[];
  activeVaultFolderId?: string | null;
  onSelectVaultFolder?: (folder: SavedWorkspaceFolder) => void;
  onCreateVaultFolder?: (name: string) => Promise<void> | void;
  onRenameVaultFolder?: (id: string, name: string) => Promise<void> | void;
  onDeleteVaultFolder?: (id: string) => Promise<void> | void;
  onOpenAuthModal?: () => void;
}

interface FolderTreeNode {
  name: string;
  path: string;
  isDir: boolean;
  file?: WorkspaceFile;
  children: FolderTreeNode[];
}

function buildWorkspaceTree(allFiles: WorkspaceFile[]): FolderTreeNode[] {
  const rootMap = new Map<string, FolderTreeNode>();

  const ensureChildren = (segments: string[], file: WorkspaceFile) => {
    let currentMap = rootMap;
    let accum = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accum = accum ? `${accum}/${seg}` : seg;
      const isLast = i === segments.length - 1;
      let node = currentMap.get(seg);
      if (!node) {
        node = {
          name: seg,
          path: accum,
          isDir: !isLast,
          file: isLast ? file : undefined,
          children: [],
        };
        currentMap.set(seg, node);
      } else if (isLast) {
        node.file = file;
      }
      if (!isLast) {
        const childMap = new Map<string, FolderTreeNode>();
        for (const c of node.children) childMap.set(c.name, c);
        // Attach back after descending
        if (!(node as any).__childMap) {
          (node as any).__childMap = childMap;
        }
        currentMap = (node as any).__childMap;
      }
    }
  };

  for (const f of allFiles) {
    const clean = f.path.replace(/^\/+/, '');
    if (!clean) continue;
    ensureChildren(clean.split('/'), f);
  }

  const finalize = (map: Map<string, FolderTreeNode>): FolderTreeNode[] => {
    const arr = Array.from(map.values()).map(n => {
      const cm: Map<string, FolderTreeNode> | undefined = (n as any).__childMap;
      const children = cm ? finalize(cm) : n.children;
      return { name: n.name, path: n.path, isDir: n.isDir, file: n.file, children };
    });
    return arr.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  return finalize(rootMap);
}

const WorkspaceRunnerModal: React.FC<WorkspaceRunnerModalProps> = ({
  isOpen,
  theme,
  t,
  workspaceName,
  files,
  onClose,
  onLoadFolderFiles,
  onAddAssets,
  onUpdateFile,
  onDeleteFile,
  onClearWorkspace,
  onSaveToDisk,
  onAskAiAboutError,
  onAutoFixWorkspace,
  autoRunSignal = 0,
  user,
  vaultFolders = [],
  activeVaultFolderId,
  onSelectVaultFolder,
  onCreateVaultFolder,
  onRenameVaultFolder,
  onDeleteVaultFolder,
  onOpenAuthModal,
}) => {
  const isLight = theme === Theme.LIGHT;
  const folderPickerRef = useRef<HTMLInputElement>(null);
  const assetPickerRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'runner' | 'files' | 'assets' | 'vault'>('runner');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [reloadSeed, setReloadSeed] = useState(0);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<{ level: string; text: string }[]>([]);
  const [cmdInput, setCmdInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistIdx, setCmdHistIdx] = useState(-1);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});
  const [buildState, setBuildState] = useState<{ status: 'idle' | 'ok' | 'error'; message: string }>({
    status: 'idle',
    message: '',
  });
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [newFilePath, setNewFilePath] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isPyRunning, setIsPyRunning] = useState(false);
  const [pyOutput, setPyOutput] = useState<string | null>(null);
  const [pyError, setPyError] = useState<string | null>(null);
  const [runnerStdin, setRunnerStdin] = useState('');
  const [runnerEntryOverride, setRunnerEntryOverride] = useState('');
  const [newVaultFolderName, setNewVaultFolderName] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState('');
  const [savedToDisk, setSavedToDisk] = useState(false);

  const pushConsoleLog = React.useCallback((level: string, text: string) => {
    setConsoleLogs(prev => [...prev.slice(-120), { level, text }]);
  }, []);

  React.useEffect(() => {
    if (showConsole) {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, showConsole]);

  React.useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === '__TM_RUNNER_LOG__') {
        pushConsoleLog(ev.data.level || 'log', String(ev.data.text || ''));
      } else if (ev.data?.type === '__TM_RUNNER_BUILD__') {
        setBuildState({
          status: ev.data.status === 'error' ? 'error' : 'ok',
          message: String(ev.data.message || ''),
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [pushConsoleLog]);

  const codeFiles = useMemo(() => files.filter(f => !f.isBinary && typeof f.content === 'string'), [files]);
  const assetFiles = useMemo(
    () => files.filter(f => isMediaPath(f.path, f.mimeType) || isAssetPath(f.path)),
    [files]
  );
  const folderTree = useMemo(() => buildWorkspaceTree(files), [files]);

  const selectedFile = useMemo(
    () => files.find(f => f.path === selectedPath) || codeFiles[0] || files[0] || null,
    [files, codeFiles, selectedPath]
  );

  const builtApp = useMemo(() => buildWorkspaceProject(files, workspaceName), [files, workspaceName, reloadSeed]);

  const applyTemplate = (tpl: WorkspaceTemplate) => {
    const cloned = tpl.files.map(f => ({ ...f }));
    onLoadFolderFiles(cloned, tpl.folderName);
    setSelectedPath(cloned.find(f => !f.isBinary)?.path || '');
    setConsoleLogs([{ level: 'info', text: `$ loaded template ${tpl.folderName}/ (${cloned.length} files)` }]);
    setBuildState({ status: 'idle', message: '' });
    setPyOutput(null);
    setPyError(null);
    setShowTemplateMenu(false);
    setActiveTab('runner');
    setReloadSeed(s => s + 1);
  };

  const handleRunPythonProject = React.useCallback(async (pyFile: WorkspaceFile) => {
    setIsPyRunning(true);
    setPyOutput(null);
    setPyError(null);
    try {
      const pyodide = await getPyodideRuntime();
      try {
        pyodide.FS.mkdir('/workspace');
      } catch {
        // Folder already exists
      }
      for (const f of files) {
        if (f.isBinary || typeof f.content !== 'string') continue;
        const cleanPath = `/workspace/${f.path.replace(/^\/+/, '')}`;
        const dirs = cleanPath.split('/').slice(1, -1);
        let curr = '';
        for (const d of dirs) {
          curr += `/${d}`;
          try {
            pyodide.FS.mkdir(curr);
          } catch {
            // Exists
          }
        }
        pyodide.FS.writeFile(cleanPath, f.content);
      }

      await pyodide.runPythonAsync(`
import sys, io, os
os.chdir('/workspace')
if '/workspace' not in sys.path:
    sys.path.insert(0, '/workspace')
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
`);
      await pyodide.runPythonAsync(buildPythonStdinPreamble(runnerStdin));
      try {
        if (typeof pyodide.loadPackagesFromImports === 'function') {
          await pyodide.loadPackagesFromImports(pyFile.content || '');
        }
      } catch {
        // Ignore local workspace module names
      }
      const res = await pyodide.runPythonAsync(pyFile.content || '');
      const stdout = pyodide.runPython('sys.stdout.getvalue()') as string;
      const stderr = pyodide.runPython('sys.stderr.getvalue()') as string;
      const parts: string[] = [];
      if (stdout?.trimEnd()) parts.push(stdout.trimEnd());
      if (res !== undefined && res !== null && String(res) !== 'None') parts.push(String(res));
      if (stderr?.trimEnd()) {
        setPyError(stderr.trimEnd());
        pushConsoleLog('error', stderr.trimEnd());
      }
      const outStr = parts.length > 0 ? parts.join('\n') : stderr ? '' : '(Executed successfully)';
      setPyOutput(outStr);
      if (outStr) pushConsoleLog('log', outStr);
      setBuildState(stderr ? { status: 'error', message: 'Python error' } : { status: 'ok', message: `${pyFile.path} executed` });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setPyError(errMsg);
      pushConsoleLog('error', errMsg);
      setBuildState({ status: 'error', message: errMsg });
    } finally {
      setIsPyRunning(false);
    }
  }, [files, runnerStdin, pushConsoleLog]);

  const handleRunJavaWorkspace = React.useCallback((entryPath?: string) => {
    setPyOutput(null);
    setPyError(null);
    const res = runJavaProject(files, entryPath, runnerStdin);
    res.compileLog.forEach(line => pushConsoleLog(line.startsWith('[error]') ? 'error' : 'info', line));
    if (res.stdout) {
      setPyOutput(res.stdout);
      pushConsoleLog('log', res.stdout);
    }
    if (res.stderr) {
      setPyError(res.stderr);
      pushConsoleLog('error', res.stderr);
    }
    setBuildState(
      res.ok
        ? { status: 'ok', message: `${res.engine} ok (${res.entryPath})` }
        : { status: 'error', message: res.stderr || 'Java error' }
    );
    return res;
  }, [files, runnerStdin, pushConsoleLog]);

  const handleRunCppWorkspace = React.useCallback((entryPath?: string) => {
    setPyOutput(null);
    setPyError(null);
    const res = runCppProject(files, entryPath, runnerStdin);
    res.compileLog.forEach(line => pushConsoleLog(line.startsWith('[error]') ? 'error' : 'info', line));
    if (res.stdout) {
      setPyOutput(res.stdout);
      pushConsoleLog('log', res.stdout);
    }
    if (res.stderr) {
      setPyError(res.stderr);
      pushConsoleLog('error', res.stderr);
    }
    setBuildState(
      res.ok
        ? { status: 'ok', message: `${res.engine} ok (${res.entryPath})` }
        : { status: 'error', message: res.stderr || 'C/C++ error' }
    );
    return res;
  }, [files, runnerStdin, pushConsoleLog]);

  const runBuildCommand = React.useCallback((label = 'npm run build') => {
    setShowConsole(true);
    pushConsoleLog('cmd', `$ ${label}`);
    const check = runWorkspaceBuildCheck(files, workspaceName);
    if (check.buildLogs && check.buildLogs.length > 0) {
      check.buildLogs.forEach(line => {
        const lvl = /error|failed/i.test(line)
          ? 'error'
          : /successful|done/i.test(line)
          ? 'log'
          : 'info';
        pushConsoleLog(lvl, line);
      });
    }
    check.warnings.forEach(w => pushConsoleLog('warn', `[warn] ${w}`));
    if (!check.ok) {
      check.errors.forEach(e => pushConsoleLog('error', `[error] ${e}`));
      const msg = check.errors[0] || 'Build failed';
      setBuildState({ status: 'error', message: msg });
      return check;
    }
    pushConsoleLog(
      'info',
      `[build] ${check.framework} · ${check.stats.codeFiles} code / ${check.stats.assets} asset files compiled in ${check.stats.durationMs}ms`
    );
    setBuildState({ status: 'ok', message: `${check.framework} built (${check.stats.durationMs}ms)` });
    if (check.built.mode === 'python' && check.built.pythonEntry) {
      handleRunPythonProject(check.built.pythonEntry);
    } else if (check.built.mode === 'java' && check.built.javaEntry) {
      handleRunJavaWorkspace(check.built.javaEntry.path);
    } else if (check.built.mode === 'cpp' && check.built.cppEntry) {
      handleRunCppWorkspace(check.built.cppEntry.path);
    } else {
      setReloadSeed(s => s + 1);
    }
    return check;
  }, [files, workspaceName, pushConsoleLog, handleRunPythonProject, handleRunJavaWorkspace, handleRunCppWorkspace]);

  const lastAutoRunRef = useRef<number>(autoRunSignal);
  React.useEffect(() => {
    if (isOpen && autoRunSignal > 0 && autoRunSignal !== lastAutoRunRef.current) {
      lastAutoRunRef.current = autoRunSignal;
      const isGradleMod = files.some(f => /(fabric\.mod\.json|quilt\.mod\.json|mods\.toml|build\.gradle)/i.test(f.path));
      setActiveTab('runner');
      setShowConsole(true);
      const timer = setTimeout(() => {
        runBuildCommand(isGradleMod ? './gradlew build' : 'npm run build');
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoRunSignal, files, runBuildCommand]);

  const triggerInPlaceAutoFix = React.useCallback(async (instruction: string) => {
    if (!onAutoFixWorkspace) {
      if (onAskAiAboutError) {
        onAskAiAboutError(instruction);
        onClose();
      }
      return;
    }
    setShowConsole(true);
    setIsAutoFixing(true);
    pushConsoleLog('cmd', `$ fix ${instruction}`);
    pushConsoleLog('info', `[fix] Đang đọc toàn bộ mã nguồn trong ${workspaceName || 'folder'} (${files.length} tệp)...`);
    const recentErrs = [
      buildState.status === 'error' ? `Build Error: ${buildState.message}` : '',
      ...consoleLogs
        .filter(l => l.level === 'error' || l.level === 'warn')
        .slice(-10)
        .map(l => l.text),
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const updatedPaths = await onAutoFixWorkspace(instruction, recentErrs, (msg) => {
        pushConsoleLog('info', msg);
      });
      if (updatedPaths.length > 0) {
        pushConsoleLog('info', `[fix] Đã ghi đè vào folder (${updatedPaths.length} tệp): ${updatedPaths.join(', ')}`);
        setBuildState({ status: 'ok', message: `Fixed ${updatedPaths.length} file(s)` });
        setTimeout(() => {
          setReloadSeed(s => s + 1);
        }, 80);
      } else {
        pushConsoleLog('warn', '[fix] AI không trả về khối FILENAME nào để ghi đè vào folder.');
      }
    } catch (err: any) {
      pushConsoleLog('error', `[fix error] ${err?.message || String(err)}`);
    } finally {
      setIsAutoFixing(false);
    }
  }, [onAutoFixWorkspace, onAskAiAboutError, onClose, pushConsoleLog, workspaceName, files.length, buildState, consoleLogs]);

  const executeConsoleCommand = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setCmdHistory(prev => [...prev.slice(-30), trimmed]);
    setCmdHistIdx(-1);
    setCmdInput('');

    const lower = trimmed.toLowerCase();
    const parts = trimmed.split(/\s+/);
    const verb = parts[0].toLowerCase();
    const argRest = trimmed.slice(parts[0].length).trim();

    if (lower === 'clear' || lower === 'cls') {
      setConsoleLogs([]);
      return;
    }

    if (lower === 'help' || lower === '?') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      pushConsoleLog(
        'info',
        'Commands: build | ./gradlew build | npm run build | tsc | run | reload | ls | tree | cat <file> | open <file> | touch <file> | rm <file> | python [file] | javac [file] | g++ [file] | fix <yêu cầu> | export | zip | clear'
      );
      return;
    }

    if (
      lower === 'build' ||
      lower === 'npm run build' ||
      lower === 'pnpm build' ||
      lower === 'yarn build' ||
      lower === 'vite build' ||
      lower === './gradlew build' ||
      lower === 'gradlew build' ||
      lower === './gradlew' ||
      lower === 'gradlew' ||
      lower === 'gradle build' ||
      lower === './gradlew runclient' ||
      lower === 'gradlew runclient' ||
      lower === 'tsc' ||
      lower === 'run' ||
      lower === 'npm start' ||
      lower === 'npm run dev' ||
      lower === 'reload'
    ) {
      runBuildCommand(trimmed);
      return;
    }

    if (verb === 'ls' || verb === 'dir' || verb === 'tree') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      if (files.length === 0) {
        pushConsoleLog('warn', '(empty workspace)');
      } else {
        pushConsoleLog('info', buildAsciiTreeFromPaths(files.map(f => f.path), workspaceName || 'project'));
      }
      return;
    }

    if (verb === 'cat' || verb === 'open') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      const target = files.find(
        f => f.path.toLowerCase() === argRest.toLowerCase() || f.name.toLowerCase() === argRest.toLowerCase()
      );
      if (!target) {
        pushConsoleLog('error', `Không tìm thấy file "${argRest}" trong folder.`);
      } else if (verb === 'open') {
        setSelectedPath(target.path);
        setActiveTab('files');
        pushConsoleLog('info', `Opened ${target.path}`);
      } else {
        pushConsoleLog('info', `--- ${target.path} ---\n${(target.content || '(binary)').slice(0, 3000)}`);
      }
      return;
    }

    if (verb === 'touch' && argRest) {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      const clean = argRest.replace(/^\/+/, '');
      onUpdateFile(clean, '');
      setSelectedPath(clean);
      pushConsoleLog('info', `Created ${clean}`);
      return;
    }

    if (verb === 'rm' && argRest) {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      const target = files.find(f => f.path === argRest || f.name === argRest);
      if (!target) {
        pushConsoleLog('error', `File "${argRest}" not found.`);
      } else {
        onDeleteFile(target.path);
        pushConsoleLog('info', `Removed ${target.path}`);
      }
      return;
    }

    if (verb === 'python' || verb === 'py') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      const pyTarget =
        (argRest && files.find(f => f.path === argRest || f.name === argRest)) ||
        files.find(f => /^(src\/)?(main|app|index)\.py$/i.test(f.path)) ||
        files.find(f => /\.py$/i.test(f.path));
      if (!pyTarget) {
        pushConsoleLog('error', 'Không tìm thấy tệp .py nào trong folder.');
      } else {
        await handleRunPythonProject(pyTarget);
      }
      return;
    }

    if (verb === 'javac' || verb === 'java') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      const javaArg = parts.slice(1).find(p => !p.startsWith('-'));
      handleRunJavaWorkspace(javaArg || undefined);
      return;
    }

    if (verb === 'g++' || verb === 'gcc' || verb === 'clang++' || verb === 'cpp') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      const cppArg = parts.slice(1).find(p => /\.(cpp|cc|cxx|c|h|hpp)$/i.test(p)) || parts.slice(1).find(p => !p.startsWith('-'));
      handleRunCppWorkspace(cppArg || undefined);
      return;
    }

    if (verb === 'export') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      handleExportStandaloneBuild();
      pushConsoleLog('info', 'Exported standalone _build.html');
      return;
    }

    if (verb === 'zip') {
      pushConsoleLog('cmd', `$ ${trimmed}`);
      await handleDownloadZip();
      pushConsoleLog('info', 'Exported project .zip');
      return;
    }

    if (verb === 'fix' || /^(sửa|fix|viết lại|refactor)/i.test(lower)) {
      const instruction = verb === 'fix' ? argRest || 'Kiểm tra lỗi và sửa hoàn chỉnh mã nguồn trong folder' : trimmed;
      await triggerInPlaceAutoFix(instruction);
      return;
    }

    pushConsoleLog('cmd', `$ ${trimmed}`);
    pushConsoleLog('warn', `Lệnh không nhận diện: "${verb}". Gõ "help" để xem lệnh, hoặc gõ "build" / "fix <yêu cầu>".`);
  };

  const handleFolderPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const loaded: WorkspaceFile[] = [];
    const firstRel = (list[0] as any).webkitRelativePath || '';
    const detectedRoot = firstRel.includes('/') ? firstRel.split('/')[0] : 'my-project';

    for (const file of Array.from(list).slice(0, 300)) {
      const rawRel = (file as any).webkitRelativePath || file.name;
      if (rawRel.includes('node_modules/') || rawRel.includes('.git/') || rawRel.includes('dist/')) continue;

      const cleanPath = rawRel.includes('/') ? rawRel.split('/').slice(1).join('/') : rawRel;
      if (!cleanPath) continue;

      const isMediaOrPdf =
        isMediaPath(file.name, file.type) ||
        file.type === 'application/pdf' ||
        /\.pdf$/i.test(file.name);
      const isText =
        (!isMediaOrPdf || /\.svg$/i.test(file.name)) &&
        (file.type.startsWith('text/') ||
          file.type === 'application/json' ||
          /^(gradlew|makefile|dockerfile)$/i.test(file.name) ||
          /\.(txt|js|jsx|ts|tsx|mjs|cjs|vue|svelte|py|json|css|scss|sass|less|html?|md|csv|tsv|xml|yml|yaml|toml|sh|bash|sql|env|svg|go|rs|java|kt|kts|gradle|properties|mcmeta|frag|vert|glsl|bf|b|cfg|ini|cpp|cc|c|h|hpp|php|rb|lua)$/i.test(file.name));

      if (isMediaOrPdf && file.size <= 15 * 1024 * 1024) {
        const dataUrl = await new Promise<string>((resolve) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result || ''));
          r.onerror = () => resolve('');
          r.readAsDataURL(file);
        });
        let textContent: string | undefined;
        if (/\.svg$/i.test(file.name)) {
          try {
            textContent = await file.text();
          } catch {}
        }
        loaded.push({
          path: cleanPath,
          name: file.name,
          mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          size: file.size,
          dataUrl,
          content: textContent,
          isBinary: !textContent,
        });
      } else if (isText && file.size <= 500_000) {
        const text = await file.text();
        loaded.push({
          path: cleanPath,
          name: file.name,
          mimeType: file.type || 'text/plain',
          size: file.size,
          content: text,
          isBinary: false,
        });
      }
    }

    onLoadFolderFiles(loaded, detectedRoot);
    setActiveTab('runner');
    setConsoleLogs([]);
    setBuildState({ status: 'idle', message: '' });
    setPyOutput(null);
    setPyError(null);
    setReloadSeed(s => s + 1);
    if (folderPickerRef.current) folderPickerRef.current.value = '';
  };

  const handleAssetPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const newAssets: WorkspaceFile[] = [];
    for (const file of Array.from(list)) {
      const dataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result || ''));
        r.readAsDataURL(file);
      });
      newAssets.push({
        path: `asset/${file.name}`,
        name: file.name,
        mimeType: file.type || 'image/png',
        size: file.size,
        dataUrl,
        isBinary: true,
      });
    }

    onAddAssets(newAssets);
    setActiveTab('assets');
    if (assetPickerRef.current) assetPickerRef.current.value = '';
  };

  const handleDownloadZip = async () => {
    const textEntries = files
      .filter(f => !f.isBinary && typeof f.content === 'string')
      .map(f => ({ path: f.path, content: f.content || '' }));
    if (textEntries.length > 0) {
      await downloadZipFromFiles(`${workspaceName || 'project'}.zip`, textEntries);
    }
  };

  const handleExportStandaloneBuild = () => {
    if (!builtApp.standaloneHtml) return;
    triggerBlobDownload(
      new Blob([builtApp.standaloneHtml], { type: 'text/html;charset=utf-8' }),
      `${workspaceName || 'project'}_build.html`
    );
  };

  const copyAssetRef = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 md:p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.16 }}
            className={`w-full max-w-6xl h-[88vh] rounded-2xl border shadow-2xl overflow-hidden flex flex-col ${
              isLight ? 'bg-white border-gray-200 text-gray-900' : 'bg-secondary border-white/10 text-text-primary'
            }`}
          >
            {/* Top Toolbar */}
            <div className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
              isLight ? 'bg-gray-50 border-gray-200' : 'bg-tertiary/40 border-white/10'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-xl border shrink-0 ${
                  isLight ? 'bg-white border-gray-200 text-blue-600' : 'bg-white/5 border-white/10 text-blue-400'
                }`}>
                  <FolderOpen size={17} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">{t.workspaceTitle}</h3>
                  <div className="text-[11px] text-text-secondary flex items-center gap-1.5 tabular-nums truncate">
                    <span className="font-mono font-medium">{workspaceName || 'workspace'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{files.length} {t.filesUnit}</span>
                    {builtApp.mode !== 'none' && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{builtApp.framework}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Segmented Tabs */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                isLight ? 'bg-gray-100 border-gray-200' : 'bg-black/30 border-white/10'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveTab('runner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'runner'
                      ? 'bg-blue-600 text-white'
                      : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Play size={13} />
                  <span>{t.workspaceRunApp}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'files'
                      ? 'bg-blue-600 text-white'
                      : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <FileCode2 size={13} />
                  <span>{t.workspaceFilesTab} ({files.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('assets')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'assets'
                      ? 'bg-blue-600 text-white'
                      : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <ImageIcon size={13} />
                  <span>{t.workspaceAssetsTab} ({assetFiles.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('vault')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                    activeTab === 'vault'
                      ? 'bg-blue-600 text-white'
                      : isLight ? 'text-gray-600 hover:text-gray-900' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Database size={13} />
                  <span>Kho Folder ({vaultFolders.length})</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 relative">
                <input
                  ref={folderPickerRef}
                  type="file"
                  className="hidden"
                  multiple
                  {...({ webkitdirectory: '', directory: '' } as any)}
                  onChange={handleFolderPicked}
                />
                <input
                  ref={assetPickerRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAssetPicked}
                />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplateMenu(v => !v)}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      isLight
                        ? 'bg-white hover:bg-gray-100 border-gray-200 text-gray-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                    }`}
                  >
                    <Layers size={14} />
                    <span>Templates</span>
                  </button>

                  {showTemplateMenu && (
                    <div
                      className={`absolute right-0 mt-2 w-72 rounded-xl border shadow-xl p-1.5 z-50 ${
                        isLight ? 'bg-white border-gray-200' : 'bg-[#141418] border-white/10'
                      }`}
                    >
                      {WORKSPACE_TEMPLATES.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            isLight ? 'hover:bg-gray-100' : 'hover:bg-white/10'
                          }`}
                        >
                          <div className="text-xs font-semibold">{tpl.name}</div>
                          <div className="text-[11px] text-text-secondary mt-0.5">{tpl.stack}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => folderPickerRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <FolderOpen size={14} />
                  <span>{t.workspaceLoadFolder}</span>
                </button>

                <button
                  type="button"
                  onClick={() => assetPickerRef.current?.click()}
                  className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    isLight
                      ? 'bg-white hover:bg-gray-100 border-gray-200 text-gray-800'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                  }`}
                >
                  <ImagePlus size={14} />
                  <span className="hidden xl:inline">{t.workspaceAddAsset}</span>
                </button>

                {files.length > 0 && onSaveToDisk && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await onSaveToDisk();
                      if (ok) {
                        setSavedToDisk(true);
                        setTimeout(() => setSavedToDisk(false), 2200);
                      }
                    }}
                    className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      savedToDisk
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : isLight
                        ? 'bg-white hover:bg-gray-100 border-gray-200 text-gray-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-primary'
                    }`}
                    title={t.workspaceSaveDisk}
                  >
                    {savedToDisk ? <Check size={14} /> : <HardDriveDownload size={14} />}
                    <span className="hidden xl:inline">{savedToDisk ? t.workspaceSavedDisk : t.workspaceSaveDisk}</span>
                  </button>
                )}

                {codeFiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className={`p-2 rounded-xl border transition-colors ${
                      isLight
                        ? 'bg-white hover:bg-gray-100 border-gray-200 text-gray-700'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-secondary hover:text-text-primary'
                    }`}
                    title={t.downloadZipPrefix}
                  >
                    <Archive size={15} />
                  </button>
                )}

                {files.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearWorkspace}
                    className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
                    title={t.workspaceClear}
                  >
                    <Trash2 size={15} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className={`p-2 rounded-xl transition-colors ${
                    isLight ? 'hover:bg-gray-200 text-gray-600' : 'hover:bg-white/10 text-text-secondary'
                  }`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 flex flex-col">
              {activeTab === 'runner' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {builtApp.mode === 'none' ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-10 overflow-y-auto">
                      <div className="w-full max-w-3xl space-y-6">
                        <div className="text-center space-y-2">
                          <h4 className="text-base font-semibold">
                            {files.length === 0 ? 'Khởi tạo Folder Dự Án Đa Ngôn Ngữ & Framework' : t.appRunnerNoEntry}
                          </h4>
                          <p className="text-xs text-text-secondary">
                            Chọn một mẫu có sẵn để build & chạy hiệu ứng ngay, hoặc tải thư mục từ máy của bạn.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {WORKSPACE_TEMPLATES.map(tpl => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => applyTemplate(tpl)}
                              className={`text-left p-4 rounded-xl border transition-colors flex flex-col justify-between gap-2 ${
                                isLight
                                  ? 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold">{tpl.name}</span>
                                <Code2 size={14} className="text-blue-400 shrink-0" />
                              </div>
                              <div className="text-xs text-text-secondary">{tpl.stack}</div>
                              <div className="text-[11px] font-mono text-text-secondary">
                                {tpl.files.length} files · Click to build & run
                              </div>
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => folderPickerRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-2"
                          >
                            <FolderOpen size={15} />
                            <span>{t.workspaceLoadFolder}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => assetPickerRef.current?.click()}
                            className={`px-4 py-2 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                              isLight ? 'bg-gray-100 border-gray-200 text-gray-800' : 'bg-white/5 border-white/10 text-text-primary'
                            }`}
                          >
                            <ImagePlus size={15} />
                            <span>{t.workspaceAddAsset}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (builtApp.mode === 'python' || builtApp.mode === 'java' || builtApp.mode === 'cpp') ? (
                    (() => {
                      const entryCandidates = files.filter(f => {
                        if (f.isBinary) return false;
                        if (builtApp.mode === 'python') return /\.py$/i.test(f.path);
                        if (builtApp.mode === 'java') return /\.java$/i.test(f.path);
                        return /\.(cpp|cc|cxx|c)$/i.test(f.path);
                      });
                      const defaultEntry =
                        builtApp.pythonEntry || builtApp.javaEntry || builtApp.cppEntry || entryCandidates[0];
                      const activeEntry =
                        entryCandidates.find(f => f.path === runnerEntryOverride) || defaultEntry;
                      const langTitle =
                        builtApp.mode === 'python'
                          ? 'Python 3 (Pyodide)'
                          : builtApp.mode === 'java'
                          ? 'Java (Multi-File JVM)'
                          : 'C / C++17 (JSCPP)';
                      const triggerPolyglotRun = () => {
                        if (!activeEntry) return;
                        if (builtApp.mode === 'python') handleRunPythonProject(activeEntry);
                        else if (builtApp.mode === 'java') handleRunJavaWorkspace(activeEntry.path);
                        else handleRunCppWorkspace(activeEntry.path);
                      };
                      return (
                        <div className="flex-1 flex flex-col p-5 gap-3.5 overflow-auto">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono font-semibold text-emerald-400">
                                {langTitle}
                              </span>
                              <span className="text-zinc-500">·</span>
                              {entryCandidates.length > 1 ? (
                                <select
                                  value={activeEntry?.path || ''}
                                  onChange={(e) => setRunnerEntryOverride(e.target.value)}
                                  className="px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-mono outline-none"
                                >
                                  {entryCandidates.map(ef => (
                                    <option key={ef.path} value={ef.path}>{ef.path}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-xs font-mono text-text-secondary truncate">
                                  {activeEntry?.path}
                                </span>
                              )}
                              <span className="text-[11px] font-mono text-text-secondary">
                                ({files.filter(f => !f.isBinary).length} files)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isPyRunning}
                                onClick={triggerPolyglotRun}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5"
                              >
                                <Play size={13} />
                                <span>{isPyRunning ? t.runningCode : 'Compile & Run'}</span>
                              </button>
                              {onAskAiAboutError && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAskAiAboutError(`Hãy kiểm tra, sửa lỗi hoặc nâng cấp dự án ${langTitle} (${activeEntry?.path}) trong thư mục dự án và chạy lại.`);
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5"
                                >
                                  <Send size={13} />
                                  <span>{t.customTreeSendAi}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className={`px-3 py-2 rounded-xl border flex items-center gap-2 ${
                            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                          }`}>
                            <span className="text-[11px] font-mono text-text-secondary shrink-0">stdin:</span>
                            <input
                              type="text"
                              value={runnerStdin}
                              onChange={(e) => setRunnerStdin(e.target.value)}
                              placeholder="Nhập dữ liệu đầu vào (cách nhau bằng dấu cách hoặc xuống dòng)..."
                              className="flex-1 bg-transparent text-xs font-mono outline-none"
                            />
                          </div>

                          <pre className="p-4 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-emerald-100 overflow-auto flex-1">
                            {activeEntry?.content}
                          </pre>

                          {(pyOutput !== null || pyError !== null) && (
                            <div className="rounded-xl bg-[#09090b] border border-white/10 p-4 font-mono text-xs max-h-52 overflow-y-auto space-y-1.5">
                              <div className="text-[11px] font-semibold text-emerald-400 mb-1">
                                {t.outputLabel}
                              </div>
                              {pyOutput && <pre className="text-emerald-300 whitespace-pre-wrap">{pyOutput}</pre>}
                              {pyError && <pre className="text-red-400 whitespace-pre-wrap">{pyError}</pre>}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0">
                      {/* Runner Controls */}
                      <div className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 ${
                        isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/25 border-white/10'
                      }`}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => runBuildCommand('npm run build')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${
                              isLight ? 'hover:bg-gray-200 text-gray-700' : 'hover:bg-white/10 text-text-secondary hover:text-white'
                            }`}
                          >
                            <RotateCw size={13} />
                            <span>{t.appRunnerReload}</span>
                          </button>
                          <div className={`flex p-0.5 rounded-lg border ${
                            isLight ? 'bg-white border-gray-200' : 'bg-black/40 border-white/10'
                          }`}>
                            <button
                              type="button"
                              onClick={() => setViewportMode('desktop')}
                              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
                                viewportMode === 'desktop' ? 'bg-blue-600 text-white' : 'text-text-secondary'
                              }`}
                            >
                              <Monitor size={13} />
                              <span className="hidden sm:inline">{t.appRunnerDesktop}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewportMode('mobile')}
                              className={`px-2 py-1 rounded-md text-xs flex items-center gap-1 ${
                                viewportMode === 'mobile' ? 'bg-blue-600 text-white' : 'text-text-secondary'
                              }`}
                            >
                              <Smartphone size={13} />
                              <span className="hidden sm:inline">{t.appRunnerMobile}</span>
                            </button>
                          </div>

                          {buildState.status !== 'idle' && (
                            <span
                              className={`text-[11px] font-mono ${
                                buildState.status === 'error' ? 'text-red-400' : 'text-emerald-400'
                              }`}
                            >
                              {buildState.message}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {buildState.status === 'error' && (onAutoFixWorkspace || onAskAiAboutError) && (
                            <button
                              type="button"
                              disabled={isAutoFixing}
                              onClick={() =>
                                triggerInPlaceAutoFix(
                                  `Kiểm tra và sửa lỗi build/runtime trong folder ${workspaceName}: ${buildState.message}`
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <Wrench size={12} />
                              <span>{isAutoFixing ? 'Đang fix...' : 'Fix vào folder'}</span>
                            </button>
                          )}

                          {builtApp.standaloneHtml && (
                            <button
                              type="button"
                              onClick={handleExportStandaloneBuild}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border ${
                                isLight ? 'border-gray-200 text-gray-700 hover:bg-gray-100' : 'border-white/10 text-text-secondary hover:text-white'
                              }`}
                            >
                              <Download size={13} />
                              <span>Build .html</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setShowConsole(prev => !prev)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border ${
                              showConsole
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : isLight ? 'border-gray-200 text-gray-700' : 'border-white/10 text-text-secondary'
                            }`}
                          >
                            <Terminal size={13} />
                            <span>{t.appRunnerConsole} ({consoleLogs.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* Sandboxed Iframe Preview */}
                      <div className="flex-1 min-h-0 bg-zinc-900/60 flex items-center justify-center p-2 overflow-hidden">
                        <iframe
                          key={reloadSeed}
                          title="Live App Runner"
                          sandbox="allow-scripts allow-forms allow-modals"
                          srcDoc={builtApp.html}
                          className={`bg-white border border-white/10 shadow-2xl transition-all duration-200 ${
                            viewportMode === 'mobile'
                              ? 'w-[390px] max-w-full h-full rounded-3xl'
                              : 'w-full h-full rounded-xl'
                          }`}
                        />
                      </div>

                      {showConsole && (
                        <div className={`h-44 border-t flex flex-col ${
                          isLight ? 'border-gray-200 bg-gray-950' : 'border-white/10 bg-[#09090b]'
                        }`}>
                          <div className="flex-1 px-3 py-2 overflow-y-auto font-mono text-xs space-y-1">
                            {consoleLogs.length === 0 ? (
                              <div className="text-zinc-500">
                                Nhập lệnh build (vd: <span className="text-zinc-300">build</span>, <span className="text-zinc-300">npm run build</span>, <span className="text-zinc-300">ls</span>, <span className="text-zinc-300">fix &lt;lỗi&gt;</span>, <span className="text-zinc-300">help</span>)
                              </div>
                            ) : (
                              consoleLogs.map((entry, idx) => (
                                <div
                                  key={idx}
                                  className={`whitespace-pre-wrap break-words ${
                                    entry.level === 'error'
                                      ? 'text-red-400'
                                      : entry.level === 'warn'
                                      ? 'text-amber-400'
                                      : entry.level === 'cmd'
                                      ? 'text-blue-400 font-semibold'
                                      : entry.level === 'info'
                                      ? 'text-zinc-300'
                                      : 'text-emerald-300'
                                  }`}
                                >
                                  {entry.text}
                                </div>
                              ))
                            )}
                            <div ref={consoleEndRef} />
                          </div>

                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              if (!isAutoFixing) executeConsoleCommand(cmdInput);
                            }}
                            className="px-3 py-1.5 border-t border-white/10 bg-black/40 flex items-center gap-2"
                          >
                            <span className="text-emerald-400 font-mono text-xs select-none">$</span>
                            <input
                              type="text"
                              value={cmdInput}
                              disabled={isAutoFixing}
                              onChange={(e) => setCmdInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
                                  e.preventDefault();
                                  const nextIdx = cmdHistIdx === -1 ? cmdHistory.length - 1 : Math.max(0, cmdHistIdx - 1);
                                  setCmdHistIdx(nextIdx);
                                  setCmdInput(cmdHistory[nextIdx] || '');
                                } else if (e.key === 'ArrowDown' && cmdHistIdx !== -1) {
                                  e.preventDefault();
                                  if (cmdHistIdx >= cmdHistory.length - 1) {
                                    setCmdHistIdx(-1);
                                    setCmdInput('');
                                  } else {
                                    const nextIdx = cmdHistIdx + 1;
                                    setCmdHistIdx(nextIdx);
                                    setCmdInput(cmdHistory[nextIdx] || '');
                                  }
                                }
                              }}
                              placeholder={isAutoFixing ? 'Đang tự đọc code & fix vào folder...' : 'build, ./gradlew build, npm run build, ls, fix <mô tả>, help...'}
                              spellCheck={false}
                              className="flex-1 bg-transparent text-xs font-mono text-zinc-100 placeholder:text-zinc-500 outline-none"
                            />
                            <button
                              type="button"
                              disabled={isAutoFixing}
                              onClick={() =>
                                executeConsoleCommand(
                                  files.some(f => /(fabric\.mod\.json|build\.gradle)/i.test(f.path))
                                    ? './gradlew build'
                                    : 'npm run build'
                                )
                              }
                              className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/10 text-[11px] font-mono text-zinc-300 shrink-0"
                            >
                              build
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'files' && (
                <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3">
                  {/* Full Folder Tree */}
                  <div className={`border-r p-3 overflow-y-auto space-y-1 ${
                    isLight ? 'border-gray-200 bg-gray-50' : 'border-white/10 bg-black/20'
                  }`}>
                    <div className="flex items-center justify-between px-1 pb-2 border-b border-white/5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FolderOpen size={14} className="text-blue-400 shrink-0" />
                        <span className="text-xs font-semibold truncate">
                          {workspaceName || 'project'}/ ({files.length})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingFile(v => !v)}
                        className="p-1 rounded-lg hover:bg-blue-500/15 text-blue-400 shrink-0"
                        title="New file (e.g. src/helper.ts)"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    {isAddingFile && (
                      <div className="flex gap-1 pb-2">
                        <input
                          type="text"
                          value={newFilePath}
                          onChange={e => setNewFilePath(e.target.value)}
                          placeholder="src/App.tsx, popup.js..."
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const p = newFilePath.trim().replace(/^\/+/, '');
                            if (p) {
                              onUpdateFile(p, '');
                              setSelectedPath(p);
                              setNewFilePath('');
                              setIsAddingFile(false);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold"
                        >
                          Add
                        </button>
                      </div>
                    )}

                    {files.length === 0 ? (
                      <div className="text-xs text-text-secondary p-4 text-center">{t.workspaceEmpty}</div>
                    ) : (
                      (() => {
                        const renderNodes = (nodes: FolderTreeNode[], depth: number): React.ReactNode =>
                          nodes.map(node => {
                            if (node.isDir) {
                              const isCollapsed = Boolean(collapsedDirs[node.path]);
                              return (
                                <div key={`dir:${node.path}`}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCollapsedDirs(prev => ({ ...prev, [node.path]: !prev[node.path] }))
                                    }
                                    style={{ paddingLeft: `${depth * 14 + 8}px` }}
                                    className={`w-full flex items-center gap-1.5 pr-2 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                                      isLight
                                        ? 'hover:bg-gray-200 text-gray-700'
                                        : 'hover:bg-white/5 text-zinc-300'
                                    }`}
                                  >
                                    {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                                    {isCollapsed ? (
                                      <Folder size={13} className="text-amber-400 shrink-0" />
                                    ) : (
                                      <FolderOpen size={13} className="text-amber-400 shrink-0" />
                                    )}
                                    <span className="truncate font-semibold">{node.name}/</span>
                                  </button>
                                  {!isCollapsed && renderNodes(node.children, depth + 1)}
                                </div>
                              );
                            }

                            const f = node.file!;
                            const isImg = Boolean(f.dataUrl && (f.mimeType?.startsWith('image/') || isMediaPath(f.path, f.mimeType)));
                            const isSel = selectedFile?.path === f.path;
                            return (
                              <div
                                key={`file:${f.path}`}
                                onClick={() => setSelectedPath(f.path)}
                                style={{ paddingLeft: `${depth * 14 + 10}px` }}
                                className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg cursor-pointer text-xs font-mono transition-colors ${
                                  isSel
                                    ? 'bg-blue-600 text-white'
                                    : isLight
                                    ? 'hover:bg-gray-200 text-gray-800'
                                    : 'hover:bg-white/5 text-text-secondary hover:text-text-primary'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isImg ? (
                                    <ImageIcon size={12} className="shrink-0 opacity-80" />
                                  ) : (
                                    <FileCode2 size={12} className="shrink-0 opacity-80" />
                                  )}
                                  <span className="truncate">{node.name}</span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 shrink-0">
                                  {!f.isBinary && (
                                    <button
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        triggerBlobDownload(
                                          new Blob([f.content || ''], { type: 'text/plain;charset=utf-8' }),
                                          f.name
                                        );
                                      }}
                                      className="p-1 rounded hover:bg-black/20"
                                      title={t.downloadFileTooltip}
                                    >
                                      <Download size={12} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      onDeleteFile(f.path);
                                    }}
                                    className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          });
                        return renderNodes(folderTree, 0);
                      })()
                    )}
                  </div>

                  {/* Code Editor or Binary/Asset Preview */}
                  <div className="md:col-span-2 flex flex-col min-h-0">
                    {selectedFile ? (
                      selectedFile.isBinary || (selectedFile.dataUrl && !selectedFile.content) ? (
                        <div className="flex-1 flex flex-col min-h-0">
                          <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${
                            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                          }`}>
                            <span className="text-xs font-mono font-semibold truncate">{selectedFile.path}</span>
                            <button
                              type="button"
                              onClick={() => copyAssetRef(selectedFile.path)}
                              className="px-2.5 py-1 rounded-lg border border-white/10 text-xs flex items-center gap-1"
                            >
                              {copiedPath === selectedFile.path ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              <span>{copiedPath === selectedFile.path ? t.assetCopiedPath : t.assetCopyPath}</span>
                            </button>
                          </div>
                          <div className="flex-1 flex items-center justify-center p-6 overflow-auto bg-[#0d0d10]">
                            {selectedFile.dataUrl && selectedFile.mimeType?.startsWith('image/') ? (
                              <img src={selectedFile.dataUrl} alt={selectedFile.name} className="max-w-full max-h-full rounded-lg border border-white/10" />
                            ) : selectedFile.dataUrl && selectedFile.mimeType === 'application/pdf' ? (
                              <iframe src={selectedFile.dataUrl} title={selectedFile.name} className="w-full h-full border-0 rounded-lg" />
                            ) : (
                              <div className="text-xs font-mono text-zinc-400">Binary file ({selectedFile.size} bytes)</div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 ${
                            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                          }`}>
                            <span className="text-xs font-mono font-semibold truncate">{selectedFile.path}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTab('runner');
                                  runBuildCommand('npm run build');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                              >
                                <Play size={12} />
                                <span>Build & Run</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerBlobDownload(
                                    new Blob([selectedFile.content || ''], { type: 'text/plain;charset=utf-8' }),
                                    selectedFile.name
                                  );
                                }}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium flex items-center gap-1"
                              >
                                <Download size={12} />
                                <span>{selectedFile.name}</span>
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={selectedFile.content || ''}
                            onChange={(e) => onUpdateFile(selectedFile.path, e.target.value)}
                            spellCheck={false}
                            className={`flex-1 w-full p-4 font-mono text-xs leading-6 outline-none resize-none ${
                              isLight ? 'bg-white text-gray-900' : 'bg-[#0d0d10] text-emerald-100'
                            }`}
                          />
                        </>
                      )
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-text-secondary p-6">
                        {t.workspaceEmpty}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'assets' && (
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h4 className="text-sm font-semibold">asset/</h4>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {t.workspaceAddAsset} — HTML, React, Vue, Word &amp; PowerPoint
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => assetPickerRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
                    >
                      <ImagePlus size={14} />
                      <span>{t.workspaceAddAsset}</span>
                    </button>
                  </div>

                  {assetFiles.length === 0 ? (
                    <div className={`border-2 border-dashed rounded-2xl p-12 text-center ${
                      isLight ? 'border-gray-200 text-gray-500' : 'border-white/10 text-text-secondary'
                    }`}>
                      <ImageIcon size={28} className="mx-auto mb-3 opacity-50" />
                      <p className="text-xs">{t.workspaceEmpty}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {assetFiles.map(asset => (
                        <div
                          key={asset.path}
                          className={`rounded-xl border overflow-hidden flex flex-col ${
                            isLight ? 'bg-gray-50 border-gray-200' : 'bg-black/30 border-white/10'
                          }`}
                        >
                          <div className="h-32 bg-black/20 flex items-center justify-center overflow-hidden">
                            {asset.dataUrl ? (
                              <img
                                src={asset.dataUrl}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={24} className="opacity-40" />
                            )}
                          </div>
                          <div className="p-3 flex flex-col gap-2">
                            <span className="text-xs font-mono font-semibold truncate" title={asset.path}>
                              {asset.path}
                            </span>
                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => copyAssetRef(asset.path)}
                                className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1 border ${
                                  isLight ? 'bg-white border-gray-200 text-gray-700' : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'
                                }`}
                              >
                                {copiedPath === asset.path ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                <span>{copiedPath === asset.path ? t.assetCopiedPath : t.assetCopyPath}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteFile(asset.path)}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/15"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'vault' && (
                <div className="flex-1 p-6 overflow-y-auto space-y-5">
                  <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                    isLight ? 'bg-gray-50 border-gray-200' : 'bg-white/[0.03] border-white/10'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl border border-white/10 bg-blue-500/10 text-blue-400 shrink-0">
                        <UserIcon size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">
                          {user?.email ? `Kho Google: ${user.email}` : 'Kho Local (Khách — Guest)'}
                        </div>
                        <div className="text-[11px] text-text-secondary">
                          {user?.email
                            ? 'Mỗi folder bạn tải lên hoặc tạo mới được lưu cục bộ gắn với tài khoản Google này.'
                            : 'Đăng nhập bằng tài khoản Google để đồng bộ kho folder riêng khi quay lại.'}
                        </div>
                      </div>
                    </div>
                    {onOpenAuthModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenAuthModal();
                        }}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0"
                      >
                        {user?.email ? 'Đổi tài khoản Google' : 'Đăng nhập Google'}
                      </button>
                    )}
                  </div>

                  {/* Create New Folder or Upload From Disk */}
                  <div className="flex flex-wrap items-center gap-2">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const name = newVaultFolderName.trim();
                        if (!name || !onCreateVaultFolder) return;
                        await onCreateVaultFolder(name);
                        setNewVaultFolderName('');
                      }}
                      className="flex-1 min-w-[240px] flex gap-2"
                    >
                      <input
                        type="text"
                        value={newVaultFolderName}
                        onChange={(e) => setNewVaultFolderName(e.target.value)}
                        placeholder="Tên folder mới (vd: java-bai-tap, cpp-game, mod-1.21)..."
                        className={`flex-1 px-3.5 py-2 rounded-xl border text-xs outline-none ${
                          isLight ? 'bg-white border-gray-200' : 'bg-black/30 border-white/10 focus:border-blue-500'
                        }`}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                      >
                        <Plus size={14} />
                        <span>Tạo folder</span>
                      </button>
                    </form>

                    <button
                      type="button"
                      onClick={() => folderPickerRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <FolderOpen size={14} />
                      <span>Thêm folder từ máy</span>
                    </button>
                  </div>

                  {vaultFolders.length === 0 ? (
                    <div className={`border border-dashed rounded-2xl p-10 text-center text-xs ${
                      isLight ? 'border-gray-200 text-gray-500' : 'border-white/10 text-text-secondary'
                    }`}>
                      Chưa có folder nào trong kho của tài khoản này. Hãy bấm <strong>Tạo folder</strong> hoặc <strong>Thêm folder từ máy</strong>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {vaultFolders.map(folder => {
                        const isCurrent = folder.id === activeVaultFolderId;
                        const isRenaming = renamingFolderId === folder.id;
                        return (
                          <div
                            key={folder.id}
                            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                              isCurrent
                                ? 'border-blue-500/60 bg-blue-500/10'
                                : isLight
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-white/[0.03] border-white/10'
                            }`}
                          >
                            <div className="space-y-1.5 min-w-0">
                              {isRenaming ? (
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    value={renameFolderValue}
                                    onChange={(e) => setRenameFolderValue(e.target.value)}
                                    className="flex-1 px-2 py-1 rounded-lg bg-black/40 border border-white/15 text-xs outline-none"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      if (renameFolderValue.trim() && onRenameVaultFolder) {
                                        await onRenameVaultFolder(folder.id, renameFolderValue.trim());
                                      }
                                      setRenamingFolderId(null);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold"
                                  >
                                    Lưu
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Folder size={15} className="text-amber-400 shrink-0" />
                                    <span className="text-xs font-semibold truncate">{folder.name}</span>
                                  </div>
                                  {isCurrent && (
                                    <span className="text-[10px] font-mono text-blue-400 shrink-0">Đang mở</span>
                                  )}
                                </div>
                              )}
                              <div className="text-[11px] font-mono text-text-secondary truncate">
                                {folder.files.length} files · {folder.languages.join(', ') || 'Text'}
                              </div>
                              <div className="text-[10px] text-text-secondary">
                                Cập nhật: {new Date(folder.updatedAt).toLocaleString('vi-VN')}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectVaultFolder?.(folder);
                                  setActiveTab('runner');
                                  setReloadSeed(s => s + 1);
                                }}
                                className="flex-1 py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                              >
                                Mở & Chạy
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingFolderId(folder.id);
                                  setRenameFolderValue(folder.name);
                                }}
                                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-text-secondary"
                                title="Đổi tên"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteVaultFolder?.(folder.id)}
                                className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/15"
                                title="Xóa"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WorkspaceRunnerModal;
