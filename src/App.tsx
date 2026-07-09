import { useState } from 'react';
import { QuizView } from './components/QuizView';
import { StatsView } from './components/StatsView';

type Tab = 'quiz' | 'stats';

function App() {
  const [tab, setTab] = useState<Tab>('quiz');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-gray-800">
            📐 土地家屋調査士 一問一答○×
          </h1>
          <nav className="flex gap-1">
            <button
              onClick={() => setTab('quiz')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${
                tab === 'quiz'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              出題
            </button>
            <button
              onClick={() => setTab('stats')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${
                tab === 'stats'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              統計
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {tab === 'quiz' ? <QuizView /> : <StatsView />}
      </main>
    </div>
  );
}

export default App;
