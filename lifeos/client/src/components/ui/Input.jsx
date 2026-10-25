import { forwardRef } from 'react';
import clsx from 'clsx';

// Uses the shared `.input` class from styles/index.css.
// forwardRef is required: react-hook-form's register() attaches the field
// through the ref — without it, form state never receives input values and
// submissions fail validation with "Required".
const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={clsx('input', className)} {...props} />;
});

export default Input;
