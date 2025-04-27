'use client';

import { refreshAccessToken } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RefreshTokenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Refreshing access token...');

  useEffect(() => {
    const refreshToken = async () => {
      try {
        setLoading(true);
        const user = await getLoggedInUser();
        const result = await refreshAccessToken({ userId: user.$id });
        
        if (result) {
          setMessage('Access token refreshed successfully! Redirecting...');
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setMessage('Failed to refresh access token. Please try again.');
        }
      } catch (error) {
        console.error("Error:", error);
        setMessage('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    refreshToken();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Refresh Access Token</h1>
        <p className="mb-4">{message}</p>
        {loading && (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        )}
      </div>
    </div>
  );
} 