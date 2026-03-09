/**
 * AdminQuestions.jsx – Question management CRUD with multi-language translations
 */
import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Globe, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, studentAPI } from '../../api/services';

const ALL_TRANSLATION_LANGS = [
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'gj', name: 'Gujarati (ગુજ.)' },
  { code: 'mr', name: 'Marathi (मराठी)' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'bn', name: 'Bengali (বাংলা)' },
  { code: 'ur', name: 'Urdu (اردو)' },
];

const EMPTY_TRANS = { text: '', imageUrl: '' };
const EMPTY_OPTION_TRANS = [EMPTY_TRANS, EMPTY_TRANS, EMPTY_TRANS, EMPTY_TRANS];

const EMPTY_FORM = {
  title:        '',
  content:      '',
  imageUrl:     '',
  type:         'SCQ',
  difficulty:   'Medium',
  subject:      '',
  chapter:      '',
  topic:        '',
  options:      [{ text: '', imageUrl: '' }, { text: '', imageUrl: '' }, { text: '', imageUrl: '' }, { text: '', imageUrl: '' }],
  correctOption: 0,
  correctAnswer: '',
  positiveMarks: 4,
  negativeMarks: 1,
  hint:          '',
  hintImageUrl:  '',
  // Translations: { [langCode]: { content: { text, imageUrl }, options: [{text,imageUrl}x4], hint: { text, imageUrl } } }
  translations:  {},
};

export default function AdminQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [subjects,  setSubjects]  = useState([]);
  const [chapters,  setChapters]  = useState([]);
  const [topics,    setTopics]    = useState([]);
  const [page,      setPage]      = useState(1);
  const [total,     setTotal]     = useState(0);
  const [search,    setSearch]    = useState('');
  // Translation UI
  const [transLang, setTransLang] = useState(null); // which lang tab is open in the form

  const handleImageUpload = async (e, callback) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.loading('Uploading image...', { id: 'imgUpload' });
    try {
      const fd = new FormData();
      fd.append('image', file);
      const { data } = await adminAPI.uploadImage(fd);
      callback(data.data?.url || data.url);
      toast.success('Image uploaded successfully', { id: 'imgUpload' });
    } catch(err) {
      toast.error('Failed to upload image', { id: 'imgUpload' });
    }
  };

  useEffect(() => {
    studentAPI.getSubjects()
      .then(({ data }) => setSubjects(data.data?.subjects || data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.subject) {
      studentAPI.getChapters(form.subject)
        .then(({ data }) => setChapters(data.data?.chapters || data.data || []))
        .catch(() => setChapters([]));
    } else {
      setChapters([]);
      setTopics([]);
    }
  }, [form.subject]);

  useEffect(() => {
    if (form.chapter) {
      studentAPI.getTopics(form.chapter)
        .then(({ data }) => setTopics(data.data?.topics || data.data || []))
        .catch(() => setTopics([]));
    } else {
      setTopics([]);
    }
  }, [form.chapter]);

  const load = () => {
    setLoading(true);
    adminAPI.getQuestions({ page, limit: 20, search: search || undefined })
      .then(({ data }) => {
        setQuestions(data.data?.questions || data.data || []);
        setTotal(data.data?.total || 0);
      })
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, search]);

  // ── Translation helpers ──
  const getTransField = (langCode, field) =>
    form.translations?.[langCode]?.[field] || (field === 'options' ? EMPTY_OPTION_TRANS : EMPTY_TRANS);

  const setTransField = (langCode, field, value) => {
    setForm(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [langCode]: {
          ...(prev.translations?.[langCode] || {}),
          [field]: value,
        },
      },
    }));
  };

  const setTransOption = (langCode, optIdx, value) => {
    const opts = [...(form.translations?.[langCode]?.options || EMPTY_OPTION_TRANS)];
    opts[optIdx] = { ...opts[optIdx], ...value };
    setTransField(langCode, 'options', opts);
  };

  const handleSave = async () => {
    if (!form.title || !form.content || !form.subject) {
      toast.error('Title, content, and subject are required.'); return;
    }
    setSaving(true);
    try {
      const isInt = ['Integer', 'Numerical', 'INTEGER', 'NUMERICAL'].includes(form.type);
      const cType = form.type.toUpperCase();

      // Build multi-language content
      const contentPayload = { en: { text: form.content, imageUrl: form.imageUrl || undefined } };
      const solutionPayload = { en: { text: form.hint, imageUrl: form.hintImageUrl || undefined } };
      const optionsEnPayload = form.options.map((opt, i) => ({
        key: String.fromCharCode(65 + i),
        text: { en: opt.text, imageUrl: opt.imageUrl || undefined },
        imageUrl: opt.imageUrl || undefined,
      }));

      // Merge translations into content, solution, and options
      Object.entries(form.translations || {}).forEach(([lc, t]) => {
        if (t.content?.text?.trim()) {
          contentPayload[lc] = { text: t.content.text, imageUrl: t.content.imageUrl || undefined };
        }
        if (t.hint?.text?.trim()) {
          solutionPayload[lc] = { text: t.hint.text, imageUrl: t.hint.imageUrl || undefined };
        }
        if (!isInt && t.options) {
          t.options.forEach((o, i) => {
            if (o?.text?.trim() && optionsEnPayload[i]) {
              optionsEnPayload[i].text[lc] = o.text;
            }
          });
        }
      });

      const payload = {
        title: form.title,
        type: cType === 'INTEGER' || cType === 'NUMERICAL' ? cType : form.type,
        difficulty: form.difficulty,
        subjectId: form.subject,
        chapterId: form.chapter || undefined,
        topicId: form.topic || undefined,
        content: contentPayload,
        marks: { correct: form.positiveMarks, incorrect: -Math.abs(form.negativeMarks) },
        solution: solutionPayload,
        isActive: true,
        examCategory: 'Both',
      };

      if (isInt) {
        payload.correctAnswer = { numericValue: Number(form.correctAnswer) || 0 };
        payload.options = [];
      } else {
        payload.options = optionsEnPayload;
        payload.correctAnswer = { optionKeys: [String.fromCharCode(65 + form.correctOption)] };
      }

      if (editing) {
        await adminAPI.updateQuestion(editing, payload);
        toast.success('Question updated!');
      } else {
        await adminAPI.createQuestion(payload);
        toast.success('Question created!');
      }
      setShowForm(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      setTransLang(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return;
    try {
      await adminAPI.deleteQuestion(id);
      toast.success('Deleted.');
      load();
    } catch (_) { toast.error('Delete failed.'); }
  };

  const editQ = (q) => {
    const textContent = q.content?.en?.text || q.content?.en || q.content || '';
    const isInt = ['INTEGER', 'NUMERICAL', 'Integer', 'Numerical'].includes(q.type);

    let correctAnswer = '';
    let correctOption = 0;
    if (isInt) {
      correctAnswer = q.correctAnswer?.numericValue?.toString() || '';
    } else {
      const char = q.correctAnswer?.optionKeys?.[0] || 'A';
      correctOption = char.charCodeAt(0) - 65;
    }

    const options = (q.options || []).map(opt => ({
      text: opt.text?.en?.text || opt.text?.en || opt.text || '',
      imageUrl: opt.imageUrl || ''
    }));
    while(options.length < 4) options.push({ text: '', imageUrl: '' });

    // Restore existing translations
    const translations = {};
    ALL_TRANSLATION_LANGS.forEach(({ code }) => {
      const cEntry = q.content?.[code];
      const contentText = typeof cEntry === 'string' ? cEntry : cEntry?.text;
      if (contentText?.trim()) {
        translations[code] = translations[code] || {};
        translations[code].content = { text: contentText, imageUrl: cEntry?.imageUrl || '' };
      }
      const sEntry = q.solution?.[code];
      const solutionText = typeof sEntry === 'string' ? sEntry : sEntry?.text;
      if (solutionText?.trim()) {
        translations[code] = translations[code] || {};
        translations[code].hint = { text: solutionText, imageUrl: sEntry?.imageUrl || '' };
      }
      if (!isInt && q.options?.length) {
        const transOpts = q.options.map(opt => ({
          text: opt.text?.[code] || '',
          imageUrl: '',
        }));
        if (transOpts.some(o => o.text)) {
          translations[code] = translations[code] || {};
          translations[code].options = transOpts;
        }
      }
    });

    let formType = q.type || 'SCQ';
    if (formType === 'INTEGER') formType = 'Integer';
    else if (formType === 'NUMERICAL') formType = 'Numerical';

    setForm({
      title:         q.title || '',
      content:       textContent,
      type:          formType,
      difficulty:    q.difficulty || 'Medium',
      subject:       q.subject?._id || q.subject || '',
      chapter:       q.chapter?._id || q.chapter || '',
      topic:         q.topic?._id || q.topic || '',
      options,
      correctOption,
      correctAnswer,
      positiveMarks: q.marks?.correct ?? 4,
      negativeMarks: Math.abs(q.marks?.incorrect ?? 1),
      hint:          q.solution?.en?.text || q.hint || '',
      imageUrl:      q.content?.en?.imageUrl || q.imageUrl || '',
      hintImageUrl:  q.solution?.en?.imageUrl || q.hintImageUrl || '',
      translations,
    });
    setEditing(q._id);
    setTransLang(null);
    setShowForm(true);
  };

  const isIntType = ['Integer', 'Numerical'].includes(form.type);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--text-heading)' }}>
            Questions ({total.toLocaleString()})
          </h1>
        </div>
        <button onClick={() => { setForm(EMPTY_FORM); setEditing(null); setTransLang(null); setShowForm(true); }}
                className="btn btn-primary btn-sm gap-1.5">
          <Plus size={13} /> Add Question
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input className="input pl-9 max-w-sm" placeholder="Search questions…"
               value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="jw-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Subject</th>
                <th>Langs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10">Loading…</td></tr>
              ) : questions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No questions found.</td></tr>
              ) : questions.map((q, i) => {
                const transLangs = ALL_TRANSLATION_LANGS.filter(l => {
                  const c = q.content?.[l.code];
                  return typeof c === 'string' ? !!c : !!c?.text;
                });
                return (
                  <tr key={q._id}>
                    <td className="text-xs" style={{ color: 'var(--text-muted)' }}>{(page - 1) * 20 + i + 1}</td>
                    <td className="max-w-xs">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {q.title || 'Untitled'}
                      </p>
                    </td>
                    <td><span className="badge badge-gray text-xs">{q.type}</span></td>
                    <td>
                      <span className="text-xs font-medium"
                            style={{ color: q.difficulty === 'Easy' ? '#22c55e' : q.difficulty === 'Hard' ? '#ef4444' : '#f59e0b' }}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {q.subject?.name || '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-0.5">
                        <span className="badge badge-blue text-xs px-1">EN</span>
                        {transLangs.map(l => (
                          <span key={l.code} className="badge badge-green text-xs px-1">
                            {l.code.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => editQ(q)} className="btn btn-ghost btn-sm">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(q._id)} className="btn btn-ghost btn-sm"
                                style={{ color: 'var(--accent-danger)' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {Math.ceil(total / 20) > 1 && (
          <div className="flex items-center gap-2 justify-center p-4"
               style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="btn btn-secondary btn-sm">← Prev</button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {page}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={questions.length < 20}
                    className="btn btn-secondary btn-sm">Next →</button>
          </div>
        )}
      </div>

      {/* Question Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
             style={{ background: 'var(--bg-overlay)' }}>
          <div className="card w-full max-w-3xl my-8">
            <div className="flex items-center justify-between p-5 border-b"
                 style={{ borderColor: 'var(--border-subtle)' }}>
              <h2 className="font-bold text-base" style={{ color: 'var(--text-heading)' }}>
                {editing ? 'Edit Question' : 'Add Question'}
              </h2>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>✕</button>
            </div>

            {/* Language switcher tabs inside modal */}
            <div className="flex border-b overflow-x-auto" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-subtle)' }}>
              <button
                onClick={() => setTransLang(null)}
                className="px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all"
                style={{
                  borderBottomColor: transLang === null ? 'var(--accent-primary)' : 'transparent',
                  color: transLang === null ? 'var(--accent-primary)' : 'var(--text-muted)',
                  background: 'transparent',
                }}
              >
                🇬🇧 English (Primary)
              </button>
              {ALL_TRANSLATION_LANGS.map(l => {
                const hasContent = !!form.translations?.[l.code]?.content?.text?.trim();
                return (
                  <button
                    key={l.code}
                    onClick={() => setTransLang(l.code)}
                    className="px-3 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-all flex items-center gap-1"
                    style={{
                      borderBottomColor: transLang === l.code ? 'var(--accent-secondary)' : 'transparent',
                      color: transLang === l.code ? 'var(--accent-secondary)' : 'var(--text-muted)',
                      background: 'transparent',
                    }}
                  >
                    {l.name.split(' ')[0]}
                    {hasContent && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />}
                  </button>
                );
              })}
            </div>

            <div className="p-5 space-y-4">

              {/* ════ ENGLISH TAB ════ */}
              {transLang === null && (
                <>
                  {/* Title */}
                  <div>
                    <label className="label">Title / Short Name</label>
                    <input className="input w-full" placeholder="e.g. Projectile Motion Q1"
                           value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <label className="label">Question Content (HTML/LaTeX allowed)</label>
                    <textarea className="input resize-none w-full" rows={5}
                              value={form.content}
                              onChange={(e) => setForm({ ...form, content: e.target.value })} />
                    <div className="flex gap-2 items-center">
                      <input className="input flex-1 text-sm" placeholder="Optional Question Image URL"
                             value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
                      <label className="btn btn-secondary btn-sm cursor-pointer whitespace-nowrap">
                        Upload
                        <input type="file" className="hidden" accept="image/*"
                               onChange={(e) => handleImageUpload(e, (url) => setForm({ ...form, imageUrl: url }))} />
                      </label>
                    </div>
                    {form.imageUrl && <img src={form.imageUrl} alt="preview" className="mt-2 max-h-32 object-contain" />}
                  </div>

                  {/* Type + Difficulty */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Question Type</label>
                      <select className="input" value={form.type}
                              onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        {['SCQ', 'MCQ', 'Integer', 'Numerical'].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Difficulty</label>
                      <select className="input" value={form.difficulty}
                              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                        {['Easy', 'Medium', 'Hard'].map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Subject, Chapter, Topic */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="label">Subject</label>
                      <select className="input" value={form.subject}
                              onChange={(e) => setForm({ ...form, subject: e.target.value, chapter: '', topic: '' })}>
                        <option value="">Select subject</option>
                        {subjects.map((s) => <option key={s._id} value={s._id}>{s.name || s.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Chapter</label>
                      <select className="input" value={form.chapter} disabled={!form.subject}
                              onChange={(e) => setForm({ ...form, chapter: e.target.value, topic: '' })}>
                        <option value="">Select chapter</option>
                        {chapters.map((c) => <option key={c._id} value={c._id}>{c.name || c.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Topic</label>
                      <select className="input" value={form.topic} disabled={!form.chapter}
                              onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                        <option value="">Select topic</option>
                        {topics.map((t) => <option key={t._id} value={t._id}>{t.name || t.title}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Options */}
                  {!isIntType && (
                    <div>
                      <label className="label">Options (English)</label>
                      <div className="space-y-2">
                        {form.options.map((opt, i) => (
                          <div key={i} className="flex flex-col gap-2 p-2 border rounded-md" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="flex items-center gap-2">
                              <input type="radio" name="correct" checked={form.correctOption === i}
                                     onChange={() => setForm({ ...form, correctOption: i })} />
                              <input className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + i)} Text`}
                                     value={opt.text}
                                     onChange={(e) => {
                                       const opts = [...form.options];
                                       opts[i] = { ...opts[i], text: e.target.value };
                                       setForm({ ...form, options: opts });
                                     }} />
                            </div>
                            <div className="flex gap-2 items-center pl-6">
                              <input className="input flex-1 text-sm" placeholder={`Option ${String.fromCharCode(65 + i)} Image URL (optional)`}
                                     value={opt.imageUrl}
                                     onChange={(e) => {
                                       const opts = [...form.options];
                                       opts[i] = { ...opts[i], imageUrl: e.target.value };
                                       setForm({ ...form, options: opts });
                                     }} />
                              <label className="btn btn-secondary btn-sm cursor-pointer whitespace-nowrap">
                                Upload
                                <input type="file" className="hidden" accept="image/*"
                                       onChange={(e) => handleImageUpload(e, (url) => {
                                         const opts = [...form.options];
                                         opts[i] = { ...opts[i], imageUrl: url };
                                         setForm({ ...form, options: opts });
                                       })} />
                              </label>
                            </div>
                            {opt.imageUrl && <img src={opt.imageUrl} alt="preview" className="ml-6 max-h-20 object-contain" />}
                          </div>
                        ))}
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Select the radio button next to the correct answer.</p>
                      </div>
                    </div>
                  )}

                  {/* Integer answer */}
                  {isIntType && (
                    <div>
                      <label className="label">Correct Answer (numeric)</label>
                      <input type="number" className="input w-40" value={form.correctAnswer}
                             onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} />
                    </div>
                  )}

                  {/* Marks */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Positive Marks</label>
                      <input type="number" className="input" value={form.positiveMarks}
                             onChange={(e) => setForm({ ...form, positiveMarks: +e.target.value })} />
                    </div>
                    <div>
                      <label className="label">Negative Marks</label>
                      <input type="number" className="input" value={form.negativeMarks}
                             onChange={(e) => setForm({ ...form, negativeMarks: +e.target.value })} />
                    </div>
                  </div>

                  {/* Hint */}
                  <div className="space-y-2">
                    <label className="label">Solution / Hint (English, optional)</label>
                    <textarea className="input resize-none w-full" rows={3} placeholder="Step-by-step solution for students"
                              value={form.hint} onChange={(e) => setForm({ ...form, hint: e.target.value })} />
                    <div className="flex gap-2 items-center">
                      <input className="input flex-1 text-sm" placeholder="Optional Hint Image URL"
                             value={form.hintImageUrl} onChange={(e) => setForm({ ...form, hintImageUrl: e.target.value })} />
                      <label className="btn btn-secondary btn-sm cursor-pointer whitespace-nowrap">
                        Upload
                        <input type="file" className="hidden" accept="image/*"
                               onChange={(e) => handleImageUpload(e, (url) => setForm({ ...form, hintImageUrl: url }))} />
                      </label>
                    </div>
                    {form.hintImageUrl && <img src={form.hintImageUrl} alt="preview" className="mt-2 max-h-32 object-contain" />}
                  </div>
                </>
              )}

              {/* ════ TRANSLATION TABS ════ */}
              {transLang !== null && (() => {
                const l = ALL_TRANSLATION_LANGS.find(x => x.code === transLang);
                const tContent = form.translations?.[transLang]?.content || EMPTY_TRANS;
                const tHint    = form.translations?.[transLang]?.hint    || EMPTY_TRANS;
                const tOptions = form.translations?.[transLang]?.options || EMPTY_OPTION_TRANS;

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 rounded-xl"
                         style={{ background: 'var(--accent-secondary-light)', border: '1px solid var(--accent-secondary)' }}>
                      <Globe size={14} style={{ color: 'var(--accent-secondary)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                        Translating: {l?.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Leave blank to hide this language tab for this question.
                      </p>
                    </div>

                    {/* Question Content */}
                    <div className="space-y-2">
                      <label className="label">Question Content — {l?.name}</label>
                      <textarea className="input resize-none w-full" rows={5}
                                value={tContent.text}
                                placeholder={`Question text in ${l?.name}...`}
                                onChange={(e) => setTransField(transLang, 'content', { ...tContent, text: e.target.value })} />
                      <div className="flex gap-2 items-center">
                        <input className="input flex-1 text-sm" placeholder="Image URL (optional)"
                               value={tContent.imageUrl}
                               onChange={(e) => setTransField(transLang, 'content', { ...tContent, imageUrl: e.target.value })} />
                        <label className="btn btn-secondary btn-sm cursor-pointer whitespace-nowrap">
                          Upload
                          <input type="file" className="hidden" accept="image/*"
                                 onChange={(e) => handleImageUpload(e, (url) => setTransField(transLang, 'content', { ...tContent, imageUrl: url }))} />
                        </label>
                      </div>
                    </div>

                    {/* Options translations */}
                    {!isIntType && (
                      <div>
                        <label className="label">Options — {l?.name}</label>
                        <div className="space-y-2">
                          {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 p-2 border rounded-md"
                                 style={{ borderColor: 'var(--border-subtle)' }}>
                              <span className="w-6 h-6 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                                {String.fromCharCode(65 + i)}
                              </span>
                              <input className="input flex-1" placeholder={`Option ${String.fromCharCode(65 + i)} in ${l?.name}`}
                                     value={tOptions[i]?.text || ''}
                                     onChange={(e) => setTransOption(transLang, i, { text: e.target.value })} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Solution / Hint */}
                    <div className="space-y-2">
                      <label className="label">Solution / Hint — {l?.name} (optional)</label>
                      <textarea className="input resize-none w-full" rows={3}
                                value={tHint.text}
                                placeholder={`Solution in ${l?.name}...`}
                                onChange={(e) => setTransField(transLang, 'hint', { ...tHint, text: e.target.value })} />
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowForm(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary flex-1">
                {saving ? 'Saving…' : editing ? 'Update Question' : 'Create Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
