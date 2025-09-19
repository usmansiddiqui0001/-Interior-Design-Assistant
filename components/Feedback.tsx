import React, { useState } from 'react';

interface FeedbackProps {
  onSubmit: (rating: 'up' | 'down', comment: string) => void;
  isSubmitted: boolean;
}

const ThumbsUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-2.062 3.65A2 2 0 005.25 10h4.75" />
    </svg>
);

const ThumbsDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.738 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.085a2 2 0 001.736-.97l2.062-3.65A2 2 0 0018.75 14h-4.75" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


export const Feedback: React.FC<FeedbackProps> = ({ onSubmit, isSubmitted }) => {
    const [rating, setRating] = useState<'up' | 'down' | null>(null);
    const [comment, setComment] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating) {
            onSubmit(rating, comment);
        }
    };

    if (isSubmitted) {
        return (
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg text-center">
                <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-100">Thank you for your feedback!</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Your insights help us improve.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-100 mb-6 text-center">Did you like this design?</h3>
            <form onSubmit={handleSubmit}>
                <div className="flex justify-center items-center gap-4 mb-6">
                    <button
                        type="button"
                        onClick={() => setRating('up')}
                        className={`p-4 rounded-full transition-all duration-200 ease-in-out border-2 ${rating === 'up' ? 'bg-green-100 dark:bg-green-900/50 border-green-500 dark:border-green-600 text-green-600 dark:text-green-400 scale-110' : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700'}`}
                        aria-label="Like this design"
                    >
                        <ThumbsUpIcon className="h-8 w-8" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setRating('down')}
                        className={`p-4 rounded-full transition-all duration-200 ease-in-out border-2 ${rating === 'down' ? 'bg-red-100 dark:bg-red-900/50 border-red-500 dark:border-red-600 text-red-600 dark:text-red-400 scale-110' : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700'}`}
                        aria-label="Dislike this design"
                    >
                        <ThumbsDownIcon className="h-8 w-8" />
                    </button>
                </div>
                <div className="mb-6">
                    <label htmlFor="comment" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2 text-center">
                        Any additional comments? (Optional)
                    </label>
                    <textarea
                        id="comment"
                        name="comment"
                        rows={3}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="e.g., I love the sofa, but the wall color isn't for me..."
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-slate-700 dark:text-slate-200 dark:placeholder-slate-400"
                    />
                </div>
                <div className="text-center">
                    <button
                        type="submit"
                        disabled={!rating}
                        className="w-full max-w-xs text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 disabled:bg-indigo-300 disabled:cursor-not-allowed disabled:hover:translate-y-0 bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl dark:bg-indigo-500 dark:hover:bg-indigo-600 dark:disabled:bg-indigo-800/50"
                    >
                        Submit Feedback
                    </button>
                </div>
            </form>
        </div>
    );
};