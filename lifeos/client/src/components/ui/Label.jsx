import clsx from 'clsx';

// Uses the shared `.label` class from styles/index.css. Always pair with htmlFor.
export default function Label({ className, children, ...props }) {
  return (
    <label className={clsx('label', className)} {...props}>
      {children}
    </label>
  );
}
