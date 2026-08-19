'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { html as beautifyHtml } from 'js-beautify';
import { Button } from '@/components/ui';

interface EmailCampaignHtmlEditorProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onInsertReady?: (insert: (token: string) => void) => void;
}

export function EmailCampaignHtmlEditor({
  value,
  disabled = false,
  onChange,
  onInsertReady,
}: EmailCampaignHtmlEditorProps) {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const insertAtCursor = useCallback((token: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    if (!selection) {
      const model = editor.getModel();
      if (!model) return;
      const end = model.getFullModelRange().getEndPosition();
      editor.executeEdits('insert-variable', [
        {
          range: {
            startLineNumber: end.lineNumber,
            startColumn: end.column,
            endLineNumber: end.lineNumber,
            endColumn: end.column,
          },
          text: token,
          forceMoveMarkers: true,
        },
      ]);
    } else {
      editor.executeEdits('insert-variable', [
        {
          range: selection,
          text: token,
          forceMoveMarkers: true,
        },
      ]);
    }
    editor.focus();
  }, []);

  useEffect(() => {
    onInsertReady?.(insertAtCursor);
  }, [insertAtCursor, onInsertReady]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.updateOptions({
      readOnly: disabled,
      minimap: { enabled: false },
      wordWrap: 'on',
      lineNumbers: 'on',
      fontSize: 13,
      lineHeight: 20,
      tabSize: 2,
      automaticLayout: true,
      scrollBeyondLastLine: false,
      padding: { top: 12, bottom: 12 },
      find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: 'never',
        seedSearchStringFromSelection: 'always',
      },
    });
  };

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly: disabled });
  }, [disabled]);

  const handleFormat = () => {
    const current = editorRef.current?.getValue() ?? value;
    const formatted = beautifyHtml(current, {
      indent_size: 2,
      wrap_line_length: 100,
      preserve_newlines: true,
      max_preserve_newlines: 2,
      end_with_newline: true,
    });
    onChange(formatted);
    requestAnimationFrame(() => {
      const editor = editorRef.current;
      if (!editor) return;
      if (editor.getValue() !== formatted) editor.setValue(formatted);
    });
  };

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-white p-3 sm:p-5 dark:bg-gray-950'
          : 'overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-3 py-2 dark:border-gray-700 dark:from-gray-900 dark:to-gray-900/80">
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          HTML editor · <kbd className="rounded bg-gray-200/80 px-1 dark:bg-gray-700">⌘/Ctrl</kbd>+
          <kbd className="rounded bg-gray-200/80 px-1 dark:bg-gray-700">F</kbd> to search
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => editorRef.current?.getAction('actions.find')?.run()}
          >
            Find
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={handleFormat}
          >
            Format
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsFullscreen((prev) => !prev)}
          >
            {isFullscreen ? 'Exit' : 'Full screen'}
          </Button>
        </div>
      </div>
      <div className={isFullscreen ? 'min-h-0 flex-1' : 'h-[min(420px,55vh)] min-h-[280px]'}>
        <Editor
          language="html"
          theme="vs-dark"
          value={value}
          onChange={(next) => onChange(next ?? '')}
          onMount={handleMount}
          options={{
            readOnly: disabled,
            minimap: { enabled: false },
            wordWrap: 'on',
            fontSize: 13,
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
          loading={
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading editor…
            </div>
          }
        />
      </div>
    </div>
  );
}
