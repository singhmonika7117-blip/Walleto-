import React from 'react';

const Badge = ({
  children,
  variant = 'neutral', // 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
  className = '',
  icon: Icon
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
};

export default Badge;
