import clsx from 'clsx';

export default function Card({ as: Tag = 'section', className, children, ...props }) {
  return (
    <Tag className={clsx('card', className)} {...props}>
      {children}
    </Tag>
  );
}
