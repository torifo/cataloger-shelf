import Link from 'next/link'; // Linkコンポーネントをインポート

// Opusのデータ型を定義します。
type Opus = {
  id: number;
  title: string;
  creator: string;
  category: string;
  sub_category: string;
  status: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
};

// APIからデータを取得するための非同期関数
async function getOpuses(): Promise<Opus[]> {
  try {
    const res = await fetch('http://localhost:8080/api/opuses', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('APIからのデータ取得に失敗しました。');
    }
    return res.json();
  } catch (error) {
    console.error(error);
    throw new Error('ネットワークエラーが発生しました。バックエンドサーバーが起動しているか確認してください。');
  }
}

// ページの本体となるコンポーネント
export default async function Home() {
  const opuses = await getOpuses();

  return (
    <main className="flex min-h-screen flex-col items-center p-8 sm:p-24 bg-gray-900 text-white">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-bold">作品一覧</h1>
          {/* ↓↓↓↓ このLinkコンポーネントを追加 ↓↓↓↓ */}
          <Link href="/opuses/new" className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            新規作成
          </Link>
          {/* ↑↑↑↑ ここまで ↑↑↑↑ */}
        </div>
        
        {opuses.length === 0 ? (
          <p className="text-center text-gray-400">登録されている作品はありません。</p>
        ) : (
          <ul className="space-y-4">
            {opuses.map((opus) => (
              <li key={opus.id} className="bg-gray-800 p-6 rounded-lg shadow-md transition-transform hover:scale-105">
                <h2 className="text-2xl font-semibold text-cyan-400">{opus.title}</h2>
                <p className="text-gray-300 mt-1">{opus.creator}</p>
                <div className="flex items-center space-x-4 mt-4 text-sm text-gray-400">
                  <span className="bg-gray-700 px-2 py-1 rounded-full">{opus.category}</span>
                  <span className="bg-gray-700 px-2 py-1 rounded-full">{opus.sub_category}</span>
                  <span className="font-semibold">{opus.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
