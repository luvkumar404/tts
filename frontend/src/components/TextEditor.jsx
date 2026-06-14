export default function TextEditor({ text, onChange, highlightText }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Text editor</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {text.length.toLocaleString()} characters
        </span>
      </div>

      <textarea
        className="input min-h-[200px] resize-y font-mono text-sm leading-relaxed"
        placeholder="Paste your text here or upload a document to extract text..."
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />

      {highlightText && (
        <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3 dark:border-brand-800 dark:bg-brand-900/20">
          <p className="mb-1 text-xs font-medium text-brand-700 dark:text-brand-300">
            Currently speaking:
          </p>
          <p className="text-sm leading-relaxed">
            <span className="speaking-highlight">{highlightText}</span>
          </p>
        </div>
      )}
    </div>
  );
}
