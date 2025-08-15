
  import React from 'react';
  import { UserSummary } from '../../types';
  import Avatar from './Avatar';

  interface AvatarGroupProps {
    users: (UserSummary | null)[];
    max?: number;
  }

  const AvatarGroup: React.FC<AvatarGroupProps> = ({ users, max = 3 }) => {
    const uniqueUsers = Array.from(new Map(users.filter(Boolean).map(user => [user!.uid, user])).values());

    const visibleUsers = uniqueUsers.slice(0, max);
    const remainingCount = uniqueUsers.length - visibleUsers.length;

    return (
      <div className="flex -space-x-3 items-center">
        {visibleUsers.map(user => (
          <div key={user!.uid} className="ring-2 ring-white dark:ring-slate-900 rounded-full">
            <Avatar user={user} size="sm" />
          </div>
        ))}
        {remainingCount > 0 && (
          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 ring-2 ring-white dark:ring-slate-900 z-10">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  };

  export default AvatarGroup;
