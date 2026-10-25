import { useGetDailyQuoteQuery } from '../../../api/meta.api';
import Skeleton from '../../../components/ui/Skeleton.jsx';

export default function QuoteWidget() {
  const { data: quote, isLoading, isError } = useGetDailyQuoteQuery();

  if (isLoading) return <Skeleton className="h-16 w-full" />;
  if (isError || !quote?.text) return null;

  return (
    <blockquote className="border-l-2 border-indigo-500 pl-3">
      <p className="text-sm italic">“{quote.text}”</p>
      <footer className="mt-1 text-xs text-slate-500 dark:text-slate-400">— {quote.author}</footer>
    </blockquote>
  );
}
