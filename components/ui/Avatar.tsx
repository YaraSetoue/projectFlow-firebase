import React from 'react';
import { UserSummary, User } from '../../types';

interface AvatarProps {
  user: UserSummary | User | null;
  size?: 'sm' | 'md' | 'lg';
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  if (!user) {
    return (
        <div className={`${sizeClasses[size]} rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0`}></div>
    );
  }
  
  const name = user.displayName || 'User';
  const photoURL = user.photoURL;
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div
      title={name}
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white bg-brand-500 flex-shrink-0 overflow-hidden`}
    >
      {photoURL ? (
        <img src={photoURL} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export default Avatar;