import { useState, useEffect } from 'react';
import { adminAPI, studentAPI } from '../../api/services';
import toast from 'react-hot-toast';
import { Folder, FolderOpen, FileText, Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';

export default function AdminCurriculum() {
  const [subjects, setSubjects] = useState([]);
  const [expandedSubject, setExpandedSubject] = useState(null);
  const [expandedChapter, setExpandedChapter] = useState(null);

  // Data maps
  const [chaptersMap, setChaptersMap] = useState({});
  const [topicsMap, setTopicsMap] = useState({});

  // Loading states
  const [loading, setLoading] = useState(true);

  // Forms
  const [newSub, setNewSub] = useState('');
  const [newChap, setNewChap] = useState('');
  const [newTop, setNewTop] = useState('');

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const { data } = await studentAPI.getSubjects();
      setSubjects(data.data?.subjects || data.data || []);
    } catch (err) {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadChapters = async (subjectId) => {
    try {
      const { data } = await studentAPI.getChapters(subjectId);
      setChaptersMap(prev => ({ ...prev, [subjectId]: data.data?.chapters || data.data || [] }));
    } catch (err) {
      toast.error('Failed to load chapters');
    }
  };

  const loadTopics = async (chapterId) => {
    try {
      const { data } = await studentAPI.getTopics(chapterId);
      setTopicsMap(prev => ({ ...prev, [chapterId]: data.data?.topics || data.data || [] }));
    } catch (err) {
      toast.error('Failed to load topics');
    }
  };

  const toggleSubject = (subjectId) => {
    if (expandedSubject === subjectId) {
      setExpandedSubject(null);
      setExpandedChapter(null);
    } else {
      setExpandedSubject(subjectId);
      setExpandedChapter(null);
      if (!chaptersMap[subjectId]) {
        loadChapters(subjectId);
      }
    }
  };

  const toggleChapter = (chapterId) => {
    if (expandedChapter === chapterId) {
      setExpandedChapter(null);
    } else {
      setExpandedChapter(chapterId);
      if (!topicsMap[chapterId]) {
        loadTopics(chapterId);
      }
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSub.trim()) return;
    try {
      await adminAPI.createSubject({ name: newSub, title: newSub });
      toast.success('Subject created');
      setNewSub('');
      loadSubjects();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create subject');
    }
  };

  const handleCreateChapter = async (e, subjectId) => {
    e.preventDefault();
    if (!newChap.trim()) return;
    try {
      await adminAPI.createChapter({ name: newChap, title: newChap, subjectId });
      toast.success('Chapter created');
      setNewChap('');
      loadChapters(subjectId);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create chapter');
    }
  };

  const handleCreateTopic = async (e, chapterId) => {
    e.preventDefault();
    if (!newTop.trim()) return;
    try {
      await adminAPI.createTopic({ name: newTop, title: newTop, chapterId });
      toast.success('Topic created');
      setNewTop('');
      loadTopics(chapterId);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create topic');
    }
  };

  const handleDeleteSub = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this Subject? This might break existing questions attached to it.')) return;
    try {
      await adminAPI.deleteSubject(id);
      toast.success('Subject deleted');
      loadSubjects();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDeleteChap = async (id, subjectId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this Chapter?')) return;
    try {
      await adminAPI.deleteChapter(id);
      toast.success('Chapter deleted');
      loadChapters(subjectId);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteTop = async (id, chapterId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this Topic?')) return;
    try {
      await adminAPI.deleteTopic(id);
      toast.success('Topic deleted');
      loadTopics(chapterId);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
            Curriculum
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Manage Subjects, Chapters, and Topics folder structure.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <form onSubmit={handleCreateSubject} className="flex gap-2 max-w-md mb-6">
          <input className="input flex-1" placeholder="New Subject Name" 
                 value={newSub} onChange={e => setNewSub(e.target.value)} />
          <button type="submit" className="btn btn-primary gap-1">
            <Plus size={16} /> Add Subject
          </button>
        </form>

        {loading ? (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Loading curriculum...</div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No subjects found.</div>
        ) : (
          <div className="space-y-2 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
            {subjects.map(sub => (
              <div key={sub._id} className="border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                {/* Subject Header */}
                <div 
                  className="flex items-center justify-between p-3 px-4 cursor-pointer hover:bg-black/5"
                  style={{ background: expandedSubject === sub._id ? 'var(--bg-subtle)' : 'transparent' }}
                  onClick={() => toggleSubject(sub._id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedSubject === sub._id ? 
                      <FolderOpen size={18} style={{ color: 'var(--accent-primary)' }} /> : 
                      <Folder size={18} style={{ color: 'var(--text-muted)' }} />
                    }
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{sub.name || sub.title}</span>
                    <span className="text-xs px-2 py-0.5 rounded-md" style={{ background: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      Subject
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-md hover:bg-black/10" style={{ color: 'var(--accent-danger)' }}
                            onClick={(e) => handleDeleteSub(sub._id, e)}>
                      <Trash2 size={14} />
                    </button>
                    {expandedSubject === sub._id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {/* Chapters list (if subject expanded) */}
                {expandedSubject === sub._id && (
                  <div className="pl-6 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-card)' }}>
                    <div className="p-3 bg-black/5">
                      <form onSubmit={(e) => handleCreateChapter(e, sub._id)} className="flex gap-2 max-w-sm">
                        <input className="input input-sm flex-1" placeholder="New Chapter Name" 
                               value={newChap} onChange={e => setNewChap(e.target.value)} />
                        <button type="submit" className="btn btn-primary btn-sm gap-1">
                          <Plus size={14} /> Add
                        </button>
                      </form>
                    </div>

                    {(chaptersMap[sub._id] || []).length === 0 ? (
                      <p className="p-4 text-sm text-center italic" style={{ color: 'var(--text-muted)' }}>No chapters.</p>
                    ) : (
                      <div className="space-y-1 p-2">
                        {chaptersMap[sub._id].map(chap => (
                          <div key={chap._id} className="border rounded-md overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div 
                              className="flex items-center justify-between p-2.5 px-3 cursor-pointer hover:bg-black/5"
                              style={{ background: expandedChapter === chap._id ? 'var(--bg-subtle)' : 'transparent' }}
                              onClick={() => toggleChapter(chap._id)}
                            >
                              <div className="flex items-center gap-3">
                                {expandedChapter === chap._id ? 
                                  <FolderOpen size={16} style={{ color: 'var(--accent-primary)' }} /> : 
                                  <Folder size={16} style={{ color: 'var(--text-muted)' }} />
                                }
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{chap.name || chap.title}</span>
                                <span className="text-xs px-2 rounded-md" style={{ background: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                                  Chapter
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button className="p-1 rounded hover:bg-black/10" style={{ color: 'var(--accent-danger)' }}
                                        onClick={(e) => handleDeleteChap(chap._id, sub._id, e)}>
                                  <Trash2 size={13} />
                                </button>
                                {expandedChapter === chap._id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </div>
                            </div>

                            {/* Topics list (if chapter expanded) */}
                            {expandedChapter === chap._id && (
                              <div className="pl-6 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                <div className="p-2.5 bg-black/5">
                                  <form onSubmit={(e) => handleCreateTopic(e, chap._id)} className="flex gap-2 max-w-xs">
                                    <input className="input input-sm flex-1" placeholder="New Topic Name" 
                                           value={newTop} onChange={e => setNewTop(e.target.value)} />
                                    <button type="submit" className="btn btn-secondary btn-sm gap-1">
                                      <Plus size={14} /> Add
                                    </button>
                                  </form>
                                </div>
                                
                                {(topicsMap[chap._id] || []).length === 0 ? (
                                  <p className="p-3 text-sm text-center italic" style={{ color: 'var(--text-muted)' }}>No topics.</p>
                                ) : (
                                  <div className="p-2 space-y-1">
                                    {topicsMap[chap._id].map(top => (
                                      <div key={top._id} className="flex items-center justify-between p-2 px-3 rounded-md hover:bg-black/5">
                                        <div className="flex items-center gap-2">
                                          <FileText size={14} style={{ color: 'var(--text-secondary)' }} />
                                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{top.name || top.title}</span>
                                        </div>
                                        <button className="p-1 rounded hover:bg-black/10" style={{ color: 'var(--accent-danger)' }}
                                                onClick={(e) => handleDeleteTop(top._id, chap._id, e)}>
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
