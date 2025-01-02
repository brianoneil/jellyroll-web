import { useState } from 'react';
import { useRouter } from 'next/router';
import { createApi, authenticateUser, JellyfinError } from '@/utils/jellyfin';

interface JellyfinApi {
    baseUrl: string;
    accessToken?: string;
}

export default function Login() {
    const router = useRouter();
    const [serverUrl, setServerUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Validate server URL
            if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
                throw new JellyfinError('Server URL must start with http:// or https://');
            }

            const api = createApi(serverUrl);
            const authResult = await authenticateUser(api, username, password);
            
            if (!authResult?.AccessToken || !authResult?.User?.Id) {
                throw new JellyfinError('Invalid response from server: missing access token or user ID');
            }

            // Store auth data
            localStorage.setItem('jellyfin_token', authResult.AccessToken);
            localStorage.setItem('jellyfin_server', serverUrl);
            localStorage.setItem('jellyfin_user', username);
            localStorage.setItem('jellyfin_user_id', authResult.User.Id);
            
            console.log('Login successful:', { username, server: serverUrl });
            
            // Redirect to home page
            await router.push('/');
        } catch (err) {
            console.error('Login error:', err);
            if (err instanceof JellyfinError) {
                if (err.message === 'Invalid username or password') {
                    setError('Invalid username or password. Please check your credentials and try again.');
                } else if (err.message.includes('connect to server')) {
                    setError('Could not connect to the Jellyfin server. Please verify the server URL and ensure the server is running.');
                } else {
                    setError(err.message);
                }
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Sign in to Jellyfin
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Connect to your Jellyfin media server
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="server-url" className="block text-sm font-medium text-gray-700">
                                Server URL
                            </label>
                            <input
                                id="server-url"
                                type="url"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="http://your-server:8096"
                                value={serverUrl}
                                onChange={(e) => setServerUrl(e.target.value)}
                                disabled={isLoading}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Example: http://localhost:8096 or http://192.168.1.100:8096
                            </p>
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                                Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm bg-red-50 p-4 rounded-md">
                            <div className="font-medium">Login Error</div>
                            <div className="mt-1">{error}</div>
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                                isLoading 
                                    ? 'bg-indigo-400 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                            }`}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 