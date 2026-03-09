import { useState, useCallback, useRef } from 'react';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const STORAGE_KEY = 'kanban-gemini-key';

const PROMPT_TEMPLATE = (text) => `あなたはタスク管理アシスタントです。以下の音声入力テキストからタスクを抽出してください。

ルール:
- 複数タスクがあれば分割する
- 各タスクにtitleとcolumn(idea/todo/doing)とpriority(true/false)を設定
- 緊急・重要そうなものはpriority: true
- 具体的な行動はtodo、アイデア段階はidea、すでに着手中はdoing
- JSON配列のみ返す（説明不要）

入力: "${text}"

出力形式: [{"title":"...", "column":"todo", "priority": false}, ...]`;

export function useVoiceTask() {
  const [status, setStatus] = useState('idle'); // idle | listening | processing | done | error
  const [transcript, setTranscript] = useState('');
  const [parsedTasks, setParsedTasks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const recognitionRef = useRef(null);

  const parseWithGemini = useCallback(async (text) => {
    const apiKey = localStorage.getItem(STORAGE_KEY);
    if (!apiKey) {
      setStatus('error');
      setErrorMessage('Gemini APIキーが設定されていません。設定画面で入力してください。');
      return;
    }

    setStatus('processing');

    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT_TEMPLATE(text) }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `API Error: ${res.status}`);
      }

      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) throw new Error('APIからの応答が空です');

      const tasks = JSON.parse(raw);
      if (!Array.isArray(tasks)) throw new Error('レスポンスが配列ではありません');

      const validColumns = ['idea', 'todo', 'doing'];
      const validated = tasks.map((t) => ({
        title: String(t.title || '').trim(),
        column: validColumns.includes(t.column) ? t.column : 'todo',
        priority: Boolean(t.priority),
      })).filter((t) => t.title.length > 0);

      setParsedTasks(validated);
      setStatus('done');
    } catch (e) {
      setStatus('error');
      setErrorMessage(e.message);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('error');
      setErrorMessage('このブラウザは音声認識に対応していません。');
      return;
    }

    const apiKey = localStorage.getItem(STORAGE_KEY);
    if (!apiKey) {
      setStatus('error');
      setErrorMessage('Gemini APIキーが設定されていません。設定画面で入力してください。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      parseWithGemini(text);
    };

    recognition.onerror = (event) => {
      setStatus('error');
      setErrorMessage(`音声認識エラー: ${event.error}`);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setStatus('listening');
    setTranscript('');
    setParsedTasks([]);
    setErrorMessage('');
    recognition.start();
  }, [parseWithGemini]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (status === 'listening') {
      setStatus('idle');
    }
  }, [status]);

  const reset = useCallback(() => {
    stopListening();
    setStatus('idle');
    setTranscript('');
    setParsedTasks([]);
    setErrorMessage('');
  }, [stopListening]);

  return { status, transcript, parsedTasks, setParsedTasks, errorMessage, startListening, stopListening, reset };
}
