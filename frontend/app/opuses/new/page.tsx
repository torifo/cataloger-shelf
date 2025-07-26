// 'use client' は、このコンポーネントがブラウザ側で動作することを示すおまじないです。
// フォームの入力状態を管理するために必要です。
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewOpusPage() {
  // フォームの各入力値を管理するためのState
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [category, setCategory] = useState('book');
  const [subCategory, setSubCategory] = useState('');
  const [status, setStatus] = useState('planned');
  const [rating] = useState('');
  const [review] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // フォーム送信後にページを移動させるためのルーター
  const router = useRouter();

  // フォーム送信時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // フォームのデフォルトの送信動作をキャンセル
    setIsSubmitting(true);
    setError(null);

    try {
      // 本番環境とローカル環境を自動判定
      const API_BASE_URL = process.env.NODE_ENV === 'production'
        ? 'https://api.sheloger.opus.riumu.net/api'
        : 'http://localhost:8080/api';
      const res = await fetch(`${API_BASE_URL}/opuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          title,
          creator,
          category,
          sub_category: subCategory,
          status,
          rating: rating ? parseInt(rating, 10) : null,
          review,
        }),
      });

      if (!res.ok) {
        // APIからエラーが返ってきた場合
        const errorData = await res.json();
        throw new Error(errorData.message || 'データの登録に失敗しました。');
      }

      // 成功したらトップページに戻る
      router.push('/');
      router.refresh(); // サーバーのデータを再取得させる

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-2xl">
        <h1 className="text-4xl font-bold mb-10 text-center">新規作品登録</h1>
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-8 rounded-lg shadow-md">
          {/* 各入力フィールド */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300">作品名 *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm p-2"
            />
          </div>

          <div>
            <label htmlFor="creator" className="block text-sm font-medium text-gray-300">作者 / クリエイター</label>
            <input
              type="text"
              id="creator"
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm p-2"
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-300">大分類</label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm p-2"
            >
              <option value="book">本</option>
              <option value="program">番組</option>
              <option value="movie">映画</option>
              <option value="other">その他</option>
            </select>
          </div>

          <div>
            <label htmlFor="subCategory" className="block text-sm font-medium text-gray-300">小分類</label>
            <input
              type="text"
              id="subCategory"
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              placeholder="例: 漫画, アニメ, バラエティ"
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm p-2"
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-300">ステータス</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm p-2"
            >
              <option value="planned">気になる</option>
              <option value="in_progress">進行中</option>
              <option value="completed">完了</option>
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50"
            >
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
