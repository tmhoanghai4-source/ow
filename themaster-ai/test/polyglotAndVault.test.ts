import { describe, it, expect, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { WorkspaceFile } from '../src/types';
import {
  buildPythonStdinPreamble,
  runCppProject,
  runJavaProject,
} from '../src/lib/polyglotRunner';
import {
  WORKSPACE_TEMPLATES,
  runWorkspaceBuildCheck,
  detectWorkspaceLanguages,
} from '../src/lib/workspaceBuilder';
import {
  getAccountVaultKey,
  getRememberedGoogleAccounts,
  rememberGoogleAccount,
  listVaultFolders,
  saveVaultFolder,
  renameVaultFolder,
  deleteVaultFolder,
} from '../src/lib/folderVault';

const mk = (path: string, content: string): WorkspaceFile => ({
  path,
  name: path.split('/').pop() || path,
  mimeType: 'text/plain',
  size: content.length,
  content,
  isBinary: false,
});

// Setup localStorage polyfill for Node environment
const memStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => memStore.get(k) ?? null,
  setItem: (k: string, v: string) => {
    memStore.set(k, v);
  },
  removeItem: (k: string) => {
    memStore.delete(k);
  },
  clear: () => {
    memStore.clear();
  },
};

describe('Polyglot Runner (Java, C/C++, Python)', () => {
  describe('Java Runner', () => {
    it('executes single-file Java with printf, loops, and primitive casts', () => {
      const files = [
        mk(
          'Main.java',
          `public class Main {
            public static void main(String[] args) {
              double avg = 9.75;
              int whole = (int) avg;
              double ratio = (double) whole / 2;
              int sum = 0;
              for (int i = 1; i <= 4; i++) {
                sum += i;
              }
              System.out.printf("whole=%d ratio=%.1f sum=%d%n", whole, ratio, sum);
            }
          }`
        ),
      ];
      const res = runJavaProject(files);
      expect(res.ok).toBe(true);
      expect(res.exitCode).toBe(0);
      expect(res.stdout).toBe('whole=9 ratio=4.5 sum=10');
    });

    it('compiles and executes multi-file Java OOP project with ArrayList and Scanner stdin', () => {
      const files = [
        mk(
          'src/Student.java',
          `public class Student {
            private String name;
            private int score;
            public Student(String name, int score) {
              this.name = name;
              this.score = score;
            }
            public String label() {
              return this.name + ":" + this.score;
            }
          }`
        ),
        mk(
          'src/Main.java',
          `import java.util.*;
          public class Main {
            public static void main(String[] args) {
              Scanner sc = new Scanner(System.in);
              int bonus = sc.nextInt();
              ArrayList<Student> list = new ArrayList<>();
              list.add(new Student("An", 8 + bonus));
              list.add(new Student("Binh", 7 + bonus));
              for (Student s : list) {
                System.out.println(s.label());
              }
              System.out.println("count=" + list.size());
            }
          }`
        ),
      ];
      const res = runJavaProject(files, 'src/Main.java', '2');
      expect(res.ok).toBe(true);
      expect(res.stdout).toBe('An:10\nBinh:9\ncount=2');
    });

    it('reports unbalanced brace errors cleanly before execution', () => {
      const res = runJavaProject([
        mk('Broken.java', 'public class Broken { public static void main(String[] args) { System.out.println("hi"); }'),
      ]);
      expect(res.ok).toBe(false);
      expect(res.exitCode).toBe(1);
      expect(res.stderr).toContain('Broken.java');
    });
  });

  describe('C / C++ Runner', () => {
    it('executes classic C++ cin/cout through real JSCPP interpreter', () => {
      const files = [
        mk(
          'main.cpp',
          `#include <iostream>
          using namespace std;
          int main() {
            int a, b;
            cin >> a >> b;
            cout << "Sum=" << (a + b) << endl;
            return 0;
          }`
        ),
      ];
      const res = runCppProject(files, 'main.cpp', '5 7');
      expect(res.ok).toBe(true);
      expect(res.engine).toBe('JSCPP');
      expect(res.stdout).toBe('Sum=12');
    });

    it('links multi-file C++ project via #include "..." and extra .cpp sources', () => {
      const files = [
        mk(
          'include/math_utils.h',
          `#pragma once
          int square(int x);`
        ),
        mk(
          'src/math_utils.cpp',
          `#include "include/math_utils.h"
          int square(int x) { return x * x; }`
        ),
        mk(
          'src/main.cpp',
          `#include <iostream>
          #include "include/math_utils.h"
          using namespace std;
          int main() {
            cout << "sq=" << square(6) << endl;
            return 0;
          }`
        ),
      ];
      const res = runCppProject(files, 'src/main.cpp');
      expect(res.ok).toBe(true);
      expect(res.stdout).toBe('sq=36');
    });

    it('executes modern C++17 STL (vector, sort, range-for) seamlessly via fallback VM', () => {
      const files = [
        mk(
          'algo.cpp',
          `#include <iostream>
          #include <vector>
          #include <algorithm>
          using namespace std;
          int main() {
            vector<int> nums = {9, 2, 5, 1};
            nums.push_back(4);
            sort(nums.begin(), nums.end());
            int total = 0;
            for (auto x : nums) total += x;
            cout << "size=" << nums.size() << " first=" << nums.front() << " sum=" << total << endl;
            return 0;
          }`
        ),
      ];
      const res = runCppProject(files, 'algo.cpp');
      expect(res.ok).toBe(true);
      expect(res.stdout).toBe('size=5 first=1 sum=21');
    });

    it('reports unbalanced C++ braces cleanly', () => {
      const res = runCppProject([mk('bad.cpp', 'int main() { return 0;')]);
      expect(res.ok).toBe(false);
      expect(res.stderr).toContain('bad.cpp');
    });
  });

  describe('Python Stdin Preamble', () => {
    it('executes real Python 3 scripts reading multi-line input() without EOF/OSError', () => {
      const userPy = `name = input("Name: ")\na = int(input())\nb = int(input())\nprint(f"{name}:{a+b}")`;
      const fullPy = `${buildPythonStdinPreamble('Minh\n10\n15')}\n${userPy}`;
      const output = execFileSync('python3', ['-c', fullPy], { encoding: 'utf8' });
      expect(output.trim()).toBe('Name: Minh:25');
    });
  });
});

describe('Workspace Builder & Templates', () => {
  it('detects languages including Java, C/C++, Python, TypeScript', () => {
    const langs = detectWorkspaceLanguages([
      mk('src/Main.java', 'class Main {}'),
      mk('src/main.cpp', 'int main(){}'),
      mk('app.py', 'print(1)'),
      mk('src/App.tsx', 'export default () => null;'),
    ]);
    expect(langs).toContain('Java');
    expect(langs).toContain('C/C++');
    expect(langs).toContain('Python');
    expect(langs).toContain('TypeScript');
  });

  it('builds and validates every workspace template cleanly and runs java-oop & cpp-algo templates', () => {
    expect(WORKSPACE_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    for (const tpl of WORKSPACE_TEMPLATES) {
      const check = runWorkspaceBuildCheck(tpl.files, tpl.folderName);
      expect(check.ok, `Template ${tpl.id} failed: ${check.errors.join('; ')}`).toBe(true);
    }

    const javaTpl = WORKSPACE_TEMPLATES.find(t => t.id === 'java-oop')!;
    expect(javaTpl).toBeDefined();
    const javaRes = runJavaProject(javaTpl.files, undefined, '3');
    expect(javaRes.ok).toBe(true);
    expect(javaRes.stdout).toContain('An -> 9.2');
    expect(javaRes.stdout).toContain('Average score: 9.10');

    const cppTpl = WORKSPACE_TEMPLATES.find(t => t.id === 'cpp-algo')!;
    expect(cppTpl).toBeDefined();
    const cppRes = runCppProject(cppTpl.files, undefined, '5');
    expect(cppRes.ok).toBe(true);
    expect(cppRes.stdout.length).toBeGreaterThan(0);
  });
});

describe('Local Per-Google-Account Folder Vault', () => {
  beforeEach(() => {
    memStore.clear();
  });

  it('derives normalized vault keys for Google accounts and guest', () => {
    expect(getAccountVaultKey({ email: '  User@Gmail.com ' })).toBe('user@gmail.com');
    expect(getAccountVaultKey({ username: 'DevOne' })).toBe('devone');
    expect(getAccountVaultKey(null)).toBe('guest');
  });

  it('saves, isolates, restores, renames, and deletes multiple folders per Google account', async () => {
    const aliceKey = getAccountVaultKey({ email: 'alice@gmail.com', username: 'Alice' });
    const bobKey = getAccountVaultKey({ email: 'bob@gmail.com', username: 'Bob' });

    rememberGoogleAccount({ email: 'alice@gmail.com', username: 'Alice' });
    rememberGoogleAccount({ email: 'bob@gmail.com', username: 'Bob' });
    expect(getRememberedGoogleAccounts().map(a => a.email)).toEqual(['bob@gmail.com', 'alice@gmail.com']);

    const f1 = await saveVaultFolder(aliceKey, {
      name: 'java-homework',
      files: [mk('Main.java', 'public class Main {}')],
    });
    const f2 = await saveVaultFolder(aliceKey, {
      name: 'cpp-contest',
      files: [mk('main.cpp', 'int main(){return 0;}')],
    });
    const b1 = await saveVaultFolder(bobKey, {
      name: 'bob-python',
      files: [mk('main.py', 'print("bob")')],
    });

    // Account isolation
    const aliceFolders = await listVaultFolders(aliceKey);
    const bobFolders = await listVaultFolders(bobKey);
    expect(aliceFolders).toHaveLength(2);
    expect(bobFolders).toHaveLength(1);
    expect(bobFolders[0].name).toBe('bob-python');

    // Cross-account delete protection
    await deleteVaultFolder(bobKey, f1.id);
    expect(await listVaultFolders(aliceKey)).toHaveLength(2);

    // Rename
    const renamed = await renameVaultFolder(aliceKey, f1.id, 'java-oop-v2');
    expect(renamed?.name).toBe('java-oop-v2');

    // Delete own folder
    await deleteVaultFolder(aliceKey, f2.id);
    const afterDel = await listVaultFolders(aliceKey);
    expect(afterDel).toHaveLength(1);
    expect(afterDel[0].name).toBe('java-oop-v2');

    // Re-login simulation with same Google email restores exact saved folders
    const reLoginKey = getAccountVaultKey({ email: 'ALICE@GMAIL.COM' });
    const restored = await listVaultFolders(reLoginKey);
    expect(restored).toHaveLength(1);
    expect(restored[0].files[0].path).toBe('Main.java');
    expect(b1.accountKey).toBe('bob@gmail.com');
  });
});
