import clsx from 'clsx';

// Uses the shared `.input` class from styles/index.css.
export default function Input({ className, ...props }) {
  return <input className={clsx('input', className)} {...props} />;
}
