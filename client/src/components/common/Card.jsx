import React from 'react';

const Card = ({
  children,
  hover = false,
  className = '',
  onClick,
  style = {},
  ...props
}) => {
  return (
    <div
      className={`card ${hover ? 'card-hover' : ''} ${className}`}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
