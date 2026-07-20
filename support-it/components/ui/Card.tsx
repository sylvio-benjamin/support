import React from 'react';

export function Card({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-lg shadow-[0_1px_3px_rgba(15,23,42,0.08)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`px-5 py-4 border-b border-slate-200 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ className = '', children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 ${className}`} {...rest}>
      {children}
    </div>
  );
}

export default Card;
