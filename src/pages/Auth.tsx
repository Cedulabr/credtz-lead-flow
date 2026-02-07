import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { checkConnection } from '@/integrations/supabase/client';
import easynLogo from '@/assets/easyn-logo.jpg';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Check connection status on mount
  useEffect(() => {
    const checkDbConnection = async () => {
      try {
        const isConnected = await checkConnection();
        setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      } catch (error) {
        console.error('Connection check failed:', error);
        setConnectionStatus('disconnected');
      }
    };
    
    checkDbConnection();
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Check connection before attempting sign in
      if (connectionStatus === 'disconnected') {
        const isConnected = await checkConnection();
        if (!isConnected) {
          setError('Unable to connect to the server. Please check your internet connection and try again.');
          toast.error('Connection failed. Please check your internet connection.');
          return;
        }
        setConnectionStatus('connected');
      }

      const { error } = await signIn(email, password);
      
      if (error) {
        let errorMessage = 'Login failed';
        
        // Provide more specific error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please check your email and confirm your account before signing in.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a moment before trying again.';
        } else {
          errorMessage = error.message;
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } else {
        toast.success('Login successful! Welcome back.');
        navigate('/');
      }
    } catch (error: any) {
      const errorMessage = 'An unexpected error occurred. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img 
            src={easynLogo} 
            alt="Easyn Logo" 
            className="mx-auto h-16 w-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-foreground">
            Bem vindo à Easyn
          </h1>
          <p className="text-muted-foreground">
            Sua fábrica de resultados começa nos leads.
          </p>
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-center text-xl">Acesso à conta</CardTitle>
            <CardDescription className="text-center">
              Faça login para acessar seu painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || connectionStatus === 'disconnected'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Senha</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || connectionStatus === 'disconnected'}
                />
              </div>
              
              {/* Connection Status */}
              {connectionStatus === 'checking' && (
                <Alert>
                  <AlertDescription className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Checking connection...
                  </AlertDescription>
                </Alert>
              )}
              
              {connectionStatus === 'disconnected' && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Unable to connect to the server. Please check your internet connection.
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || connectionStatus === 'disconnected'}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;