import clsx from 'clsx';

export default function Logo({ className }) {
  return (
    <span className={clsx('inline-flex items-center gap-2 font-semibold', className)}>
      <img src="/favicon.svg" alt="" className="h-6 w-6" aria-hidden="true" />
      LifeOS
    </span>
  );
}
