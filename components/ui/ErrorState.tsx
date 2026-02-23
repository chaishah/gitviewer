import { AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  rateLimited?: boolean;
  onRetry?: () => void;
}

export function ErrorState({ message, rateLimited, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <div className="p-3 bg-[#3d1f1f] rounded-full mb-4">
        {rateLimited ? (
          <Clock className="w-6 h-6 text-[#f85149]" />
        ) : (
          <AlertCircle className="w-6 h-6 text-[#f85149]" />
        )}
      </div>
      <h3 className="text-[#e6edf3] font-semibold mb-1">
        {rateLimited ? 'Rate Limit Exceeded' : 'Something went wrong'}
      </h3>
      <p className="text-[#8b949e] text-sm max-w-sm mb-4">{message}</p>
      {rateLimited && (
        <p className="text-[#8b949e] text-xs mb-4 max-w-sm bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2">
          Set a <code className="text-[#58a6ff]">GITHUB_TOKEN</code> environment variable to increase rate limits from 60 to 5,000 req/hour.
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-full bg-[#161b22] border border-[#30363d] flex items-center justify-center mb-3">
        <span className="text-2xl">📭</span>
      </div>
      <p className="text-[#8b949e] text-sm">{message}</p>
    </div>
  );
}
