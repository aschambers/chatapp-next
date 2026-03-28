'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDispatch } from 'react-redux';
import { AppDispatch, useAppSelector } from '@/lib/redux/store';
import { userSignup } from '@/lib/redux/modules/users/users';

export default function SignupPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { error, isLoading, success } = useAppSelector((s) => s.user);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    dispatch(userSignup({ username, email, password }));
  };

  if (success) {
    return (
      <div className="w-full">
        <div className="rounded-lg bg-gray-800 p-8 text-center text-white shadow-lg">
          <h2 className="mb-2 text-xl font-bold">Check your email</h2>
          <p className="text-gray-300">
            We sent a verification link to <strong>{email}</strong>.
          </p>
          <Link href="/login" className="mt-4 inline-block text-yellow-300 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-sm rounded-lg bg-gray-800 p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-bold text-white">Create account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                if (e.target.value.length <= 32) setUsername(e.target.value);
              }}
              required
              className="w-full rounded bg-gray-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded bg-gray-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded bg-gray-700 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>
          {error && <p className="text-sm text-red-400">Username or email already exists.</p>}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-yellow-500 py-2 font-semibold text-gray-900 hover:bg-yellow-600 disabled:opacity-50"
          >
            {isLoading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-yellow-300 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="mt-3 text-center text-xs text-gray-500">
          By signing up you agree to our{' '}
          <Link href="/terms" className="hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
