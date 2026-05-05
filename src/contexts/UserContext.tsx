import { useState, createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { mockUsers } from '../store/mockDb';
import type { User } from '../store/mockDb';

interface UserContextType {
  users: User[];
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
}

const USERS_KEY = 'vidadeaprendiz_users';

export const UserContext = createContext<UserContextType | null>(null);

export function useUsers() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUsers must be used within UserProvider');
  return context;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => {
    const savedUsers = localStorage.getItem(USERS_KEY);
    if (savedUsers) {
      try {
        return JSON.parse(savedUsers);
      } catch (e) {
        console.error('Failed to parse saved users', e);
      }
    }
    return mockUsers;
  });

  // Sync back to localStorage if users change (though functions already do this, it's a good safety)
  useEffect(() => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }, [users]);

  const addUser = (newUser: User) => {
    setUsers(prev => {
      const updated = [...prev, newUser];
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => {
      const updated = prev.map(u => u.id === id ? { ...u, ...updates } : u);
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const deleteUser = (id: string) => {
    setUsers(prev => {
      const updated = prev.filter(u => u.id !== id);
      localStorage.setItem(USERS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <UserContext.Provider value={{ users, addUser, updateUser, deleteUser }}>
      {children}
    </UserContext.Provider>
  );
}
