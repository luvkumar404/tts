import { useState } from 'react';
import API from '../api/axios';
import { speechController } from '../utils/speech';

const Section = ({ title, value }) => value?.length ? <section className="mt-4"><h4 className="text-sm font-semibold">{title}</h4>{Array.isArray(value) ? <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{value.map((item, index) => <li key={index}>{typeof item === 'string' ? item : `${item.question} — ${item.answer}`}</li>)}</ul> : <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</p>}</section> : null;

const Citations = ({ items, onOpen }) => <div className="mt-3 space-y-1">{items?.map((item, index) => <button key={index} onClick={() => onOpen(item.chapterNumber - 1)} className="block text-left text-xs text-brand-600 underline">Chapter {item.chapterNumber}{item.page ? `, page ${item.page}` : ''}: {item.excerpt}</button>)}</div>;

export default function TutorPanel({ bookId, chapterIndex, selectedText, onOpenChapter }) {
  const [level, setLevel] = useState('student');
  const [scope, setScope] = useState('chapter');
  const [lesson, setLesson] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const teach = async () => {
    setLoading('lesson'); setError(''); setLesson(null);
    try { setLesson((await API.post(`/documents/${bookId}/lessons`, { scope, chapterIndex, level })).data); }
    catch (err) { setError(err.response?.data?.message || 'Could not generate the lesson.'); }
    finally { setLoading(''); }
  };
  const ask = async (preset) => {
    const prompt = preset || question.trim(); if (!prompt) return;
    setLoading('chat'); setError('');
    try { setAnswer((await API.post(`/documents/${bookId}/tutor`, { question: prompt, context: scope, chapterIndex, selectedText })).data); setQuestion(''); }
    catch (err) { setError(err.response?.data?.message || 'Tutor request failed.'); }
    finally { setLoading(''); }
  };
  const current = lesson?.lesson;
  return <aside className="h-full overflow-y-auto border-l border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:w-[360px]">
    <h2 className="text-lg font-bold">Teach Me</h2>
    <div className="mt-3 grid grid-cols-2 gap-2"><select className="input" value={scope} onChange={(e) => setScope(e.target.value)}><option value="chapter">Current chapter</option><option value="book">Complete book</option></select><select className="input" value={level} onChange={(e) => setLevel(e.target.value)}><option value="beginner">Beginner</option><option value="student">Student</option><option value="advanced">Advanced</option></select></div>
    <button className="btn-primary mt-2 w-full" onClick={teach} disabled={!!loading}>{loading === 'lesson' ? 'Building grounded lesson…' : 'Generate lesson'}</button>
    {selectedText && <p className="mt-2 rounded bg-brand-50 p-2 text-xs dark:bg-brand-950">Selected text will be included as question context.</p>}
    {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    {current && <div className="mt-4 border-t pt-2 dark:border-gray-700"><Section title="Simple explanation" value={current.simpleExplanation} /><Section title="Detailed explanation" value={current.detailedExplanation} /><Section title="Key ideas" value={current.keyIdeas} /><Section title="Important definitions" value={current.definitions} /><Section title="Practical examples" value={current.practicalExamples} /><Section title="Summary" value={current.summary} /><Section title="Takeaways" value={current.takeaways} />{current.importantImages?.length > 0 && <section className="mt-4"><h4 className="text-sm font-semibold">Important images</h4><ul className="mt-1 list-disc pl-5 text-sm">{current.importantImages.map((image) => <li key={image.id}>{image.label}{image.pageNumber ? ` on page ${image.pageNumber}` : ''}{image.caption ? ` — ${image.caption}` : ''}</li>)}</ul></section>}<Section title="Flashcards" value={current.flashcards} /><Section title="Short-answer questions" value={current.shortAnswerQuestions} /><Section title="Revision notes" value={current.revisionNotes} />
      {current.quiz?.length > 0 && <section className="mt-4"><h4 className="text-sm font-semibold">Multiple-choice quiz</h4>{current.quiz.map((item, i) => <details key={i} className="mt-2 rounded border p-2 text-sm dark:border-gray-700"><summary>{item.question}</summary><ol className="mt-2 list-[upper-alpha] pl-5">{item.options.map((option, j) => <li key={j}>{option}</li>)}</ol><p className="mt-2 text-brand-600">Answer: {String.fromCharCode(65 + item.answer)}</p></details>)}</section>}
      <Citations items={current.citations} onOpen={onOpenChapter} /></div>}
    {lesson?.lessons && <div className="mt-4"><p className="text-sm font-semibold">Book lesson</p>{lesson.lessons.map((item, i) => <details key={i} className="mt-2 rounded border p-2 dark:border-gray-700"><summary className="text-sm font-medium">{item.chapterTitle}</summary><p className="mt-2 text-sm">{item.summary}</p></details>)}</div>}
    <div className="mt-6 border-t pt-4 dark:border-gray-700"><h3 className="font-semibold">Ask the book</h3><div className="mt-2 flex flex-wrap gap-1">{['Explain this chapter simply.', 'What is the main idea?', 'Give me an example.', 'Quiz me on this chapter.', 'Create revision notes.'].map((text) => <button key={text} onClick={() => ask(text)} className="rounded-full border px-2 py-1 text-xs dark:border-gray-700">{text}</button>)}</div><textarea className="input mt-2 min-h-20" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question grounded in this book…" /><button className="btn-primary mt-2" onClick={() => ask()} disabled={!!loading}>{loading === 'chat' ? 'Searching book…' : 'Ask'}</button></div>
    {answer && <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><p className="text-sm leading-relaxed">{answer.answer}</p><button className="btn-outline mt-2 px-2 py-1 text-xs" onClick={() => speechController.speakParagraphs([answer.answer])}>Listen</button><Citations items={answer.citations} onOpen={onOpenChapter} /></div>}
  </aside>;
}
