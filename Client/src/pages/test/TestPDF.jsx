import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI } from '../../api/services';
import { Printer, ArrowLeft } from 'lucide-react';
import { useLang } from '../../context/LanguageContext';

export default function TestPDF() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { activeLang } = useLang();
  
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentAPI.getTestById(testId)
      .then(({ data }) => {
        setTest(data?.data?.test || data?.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [testId]);

  const getText = useCallback((field) => {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (typeof field.text === 'string') return field.text;
    for (const code of [activeLang, 'en', 'hi']) {
      const v = field[code];
      if (!v) continue;
      const t = typeof v === 'string' ? v : v.text;
      if (t?.trim()) return t;
    }
    return '';
  }, [activeLang]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-8 h-8 border-4 rounded-full animate-spin"
             style={{ borderColor: 'var(--border-subtle)', borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!test) {
    return <div className="p-8 text-center text-red-500">Failed to load mock paper.</div>;
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Non-printable header controls */}
      <div className="print:hidden p-4 flex items-center justify-between border-b" style={{ background: 'var(--bg-subtle)' }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm gap-2">
           <ArrowLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} className="btn btn-primary btn-sm gap-2">
           <Printer size={16} /> Save as PDF / Print
        </button>
      </div>

      {/* Printable Area */}
      <div className="max-w-4xl mx-auto p-8 print:p-0 text-black">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold mb-2 uppercase">{test.title}</h1>
          <p className="text-lg text-gray-700 font-semibold">{test.examType} • {test.duration} mins</p>
        </div>

        {test.sections?.map((section, sIdx) => (
          <div key={section._id || sIdx} className="mb-8">
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">{section.name}</h2>
            {section.questions?.map((q, qIdx) => (
              <div key={q._id || qIdx} className="mb-6 break-inside-avoid">
                <div className="flex gap-2">
                  <span className="font-bold">{qIdx + 1}.</span>
                  <div className="flex-1" dangerouslySetInnerHTML={{ __html: getText(q.content || q.question) }} />
                </div>
                {/* Options for MCQ/SCQ */}
                {!['Integer', 'Numerical'].includes(q.type) && q.options && q.options.length > 0 && (
                  <ol className="list-[upper-alpha] px-8 py-2 grid sm:grid-cols-2 gap-2">
                    {q.options.map((opt, i) => (
                      <li key={i}>
                        <div dangerouslySetInnerHTML={{ __html: getText(opt) }} className="inline-block" />
                      </li>
                    ))}
                  </ol>
                )}
                {/* Integer type indicator */}
                {['Integer', 'Numerical'].includes(q.type) && (
                  <div className="mt-2 ml-6 text-sm text-gray-500 italic">
                    [ Answer must be an {q.type} ]
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="text-center mt-12 text-sm text-gray-500 border-t pt-4">
          — End of Paper —
        </div>
      </div>
    </div>
  );
}
