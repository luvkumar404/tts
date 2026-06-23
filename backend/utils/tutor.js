const STOP = new Set('the a an and or but if then than to of in on at for from with by is are was were be been being this that these those it its as into about can could should would may might'.split(' '));
const sentences = (text) => String(text).match(/[^.!?\n]+[.!?]+|[^.!?\n]+$/g)?.map((s) => s.trim()).filter((s) => s.length > 20) || [];
const words = (text) => String(text).toLowerCase().match(/[a-z0-9']+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) || [];
const citation = (chapter, sentence) => ({ chapterNumber: chapter.number, chapterTitle: chapter.title, page: chapter.pageStart || null, excerpt: sentence.slice(0, 220) });

const rank = (text, query, limit = 6) => {
  const terms = new Set(words(query));
  return sentences(text).map((sentence, index) => ({ sentence, index, score: words(sentence).reduce((n, word) => n + (terms.has(word) ? 2 : 0), 0) + Math.min(2, sentence.length / 180) }))
    .sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit);
};

const generateLesson = (chapter, level = 'student') => {
  const source = sentences(chapter.text);
  const important = rank(chapter.text, chapter.title, 8).map((x) => x.sentence);
  const chosen = important.length ? important : source.slice(0, 8);
  const keyIdeas = chosen.slice(0, 5);
  const definitions = source.filter((s) => /\b(?:is|means|refers to|defined as)\b/i.test(s)).slice(0, 5);
  const examples = source.filter((s) => /\b(?:example|for instance|such as)\b/i.test(s)).slice(0, 4);
  const flashcards = keyIdeas.map((idea, i) => ({ question: `What is key idea ${i + 1} in ${chapter.title}?`, answer: idea }));
  const quiz = keyIdeas.slice(0, 4).map((idea, i) => ({ question: `Which statement is supported by ${chapter.title}?`, options: [idea, ...keyIdeas.filter((x) => x !== idea).slice(0, 2), 'The chapter does not discuss this.'].slice(0, 4), answer: 0, citation: citation(chapter, idea) }));
  return {
    level, chapterNumber: chapter.number, chapterTitle: chapter.title,
    simpleExplanation: chosen.slice(0, level === 'beginner' ? 3 : 4).join(' '),
    detailedExplanation: chosen.join(' '), keyIdeas,
    definitions: definitions.length ? definitions : ['No explicit definitions were detected in this chapter.'],
    practicalExamples: examples.length ? examples : ['No explicit practical examples were detected in this chapter.'],
    summary: chosen.slice(0, 5).join(' '), takeaways: keyIdeas,
    flashcards, quiz,
    shortAnswerQuestions: keyIdeas.slice(0, 5).map((_, i) => `Explain key idea ${i + 1} from ${chapter.title} in your own words.`),
    revisionNotes: keyIdeas.map((idea) => `• ${idea}`).join('\n'),
    citations: chosen.slice(0, 5).map((s) => citation(chapter, s)),
    groundingNotice: 'Generated only from extracted chapter text; verify against the cited source excerpts.',
  };
};

const answerQuestion = (chapters, question, selectedText = '') => {
  const queryTerms = words(question);
  const candidates = [];
  chapters.forEach((chapter) => rank(`${selectedText}\n${chapter.text}`, question, 8).forEach((item) => candidates.push({ ...item, chapter })));
  candidates.sort((a, b) => b.score - a.score);
  const matches = candidates.filter((x) => x.score >= Math.max(2, Math.min(5, queryTerms.length))).slice(0, 6);
  if (!matches.length) return { answer: 'I could not find an answer to that question in the uploaded book.', citations: [], found: false };
  return { answer: matches.map((x) => x.sentence).join(' '), citations: matches.map((x) => citation(x.chapter, x.sentence)), found: true };
};

module.exports = { generateLesson, answerQuestion, rank };
