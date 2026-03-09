/**
 * Leaderboard.jsx – LeetCode-inspired leaderboard page.
 * Global + per-test ranking, time filters, podium top-3 display.
 */
import { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, ChevronDown } from 'lucide-react';
import { studentAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';

const TIME_FILTERS = ['daily', 'weekly', 'monthly', 'all-time'];

export default function Leaderboard() {
  const { user }  = useAuth();
  const [data,    setData]   = useState([]);
  const [myRank,  setMyRank] = useState(null);
  const [period,  setPeriod] = useState('weekly');
  const [loading, setLoading]= useState(true);

  useEffect(() => {
    setLoading(true);
    studentAPI.getGlobalLeaderboard({ period, limit: 50 })
      .then(({ data: r }) => {
        const list = r.data?.rankings || [];
        setData(list);
        const mine = list.find((e) => e.userId === user?._id || e.username === user?.username);
        setMyRank(mine || r.data?.userRank);
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [period]);

  const top3  = data.slice(0, 3);
  const rest  = data.slice(3);

  const RANK_ICONS = {
    0: <Crown size={16} style={{ color: '#f59e0b' }} />,
    1: <Medal size={16} style={{ color: '#94a3b8' }} />,
    2: <Medal size={16} style={{ color: '#d97706' }} />,
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
            Leaderboard
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            See where you stand among JEE aspirants nationwide
          </p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 rounded-xl"
             style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
          {TIME_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setPeriod(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: period === t ? 'var(--bg-card)' : 'transparent',
                color: period === t ? 'var(--text-heading)' : 'var(--text-muted)',
                boxShadow: period === t ? 'var(--shadow-sm)' : 'none',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── My rank card ── */}
      {myRank && (
        <div className="card p-4 flex items-center gap-4"
             style={{ border: '2px solid var(--accent-primary)', background: 'var(--accent-primary-light)' }}>
          <div className="text-2xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--accent-primary)', minWidth: '3rem', textAlign: 'center' }}>
            #{myRank.rank}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Your rank</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Score: {myRank.score ?? myRank.totalScore ?? '—'} | Tests: {myRank.testsTaken ?? '—'}
            </p>
          </div>
        </div>
      )}

      {/* ── Podium top 3 ── */}
      {!loading && top3.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[top3[1], top3[0], top3[2]].map((entry, podiumIdx) => {
            // Reordered: 2nd, 1st, 3rd for podium visual
            const rank = podiumIdx === 1 ? 1 : podiumIdx === 0 ? 2 : 3;
            const heights = { 1: 'h-24', 2: 'h-16', 3: 'h-12' };
            const colors  = { 1: { bg: '#fef3c7', accent: '#f59e0b' }, 2: { bg: '#f1f5f9', accent: '#94a3b8' }, 3: { bg: '#fef3c7', accent: '#d97706' }};
            const { bg, accent } = colors[rank];
            if (!entry) return <div key={podiumIdx} />;
            return (
              <div key={podiumIdx} className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white"
                     style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)`, fontSize: '1.1rem' }}>
                  {entry.username?.[0]?.toUpperCase() || '?'}
                </div>
                <p className="font-bold text-xs truncate w-full" style={{ color: 'var(--text-heading)' }}>
                  {entry.username}
                </p>
                <p className="text-xs font-semibold" style={{ color: accent }}>
                  {entry.score ?? entry.totalScore ?? '—'} pts
                </p>
                <div
                  className={`w-full rounded-t-lg ${heights[rank]}`}
                  style={{ background: bg, border: `2px solid ${accent}` }}
                >
                  <div className="flex items-center justify-center h-full">
                    <span className="text-lg font-black" style={{ color: accent }}>#{rank}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Full ranking table ── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 rounded-full animate-spin"
                 style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>No leaderboard data yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="jw-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Rank</th>
                  <th>Student</th>
                  <th>Tests Taken</th>
                  <th>Avg Score</th>
                  <th>Total Score</th>
                  <th>Best</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry, i) => {
                  const isMe = entry.username === user?.username || entry.userId === user?._id;
                  return (
                    <tr
                      key={entry._id || i}
                      style={{
                        background: isMe ? 'var(--accent-primary-light)' : 'transparent',
                      }}
                    >
                      <td>
                        <div className="flex items-center gap-1">
                          {RANK_ICONS[i] || null}
                          <span className="font-bold text-sm"
                                style={{ color: i < 3 ? 'var(--accent-primary)' : 'var(--text-heading)' }}>
                            #{i + 1}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs"
                            style={{ background: 'var(--gradient-brand)' }}
                          >
                            {entry.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>
                            {entry.username}
                            {isMe && <span className="ml-1.5 badge badge-orange text-xs">You</span>}
                          </span>
                        </div>
                      </td>
                      <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {entry.testsTaken ?? '—'}
                      </td>
                      <td className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                        {entry.avgScore ? `${entry.avgScore.toFixed(0)}/300` : '—'}
                      </td>
                      <td className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
                        {entry.totalScore?.toLocaleString() ?? '—'}
                      </td>
                      <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {entry.bestScore ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
