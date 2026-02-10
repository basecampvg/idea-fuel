import NextAuth from 'next-auth';
import { authConfig } from './config';

/**
 * Export Auth.js handlers and utilities
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
