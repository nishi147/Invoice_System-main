import React from 'react';

const Logo = ({ className = "h-9", alt = "MANSHU Logo" }) => {
  return (
    <img 
      src="/logo.png" 
      alt={alt} 
      className={`w-auto object-contain select-none shrink-0 ${className}`} 
    />
  );
};

export default Logo;

