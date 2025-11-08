import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    
    if (!tokenParam) {
      setMessage({ type: 'error', text: 'Invalid password reset link' });
      setIsVerifying(false);
      return;
    }

    setToken(tokenParam);
    verifyToken(tokenParam);
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch(`/api/auth/verify-reset-token/${tokenToVerify}`);
      const data = await response.json();

      if (data.valid) {
        setTokenValid(true);
      } else {
        setMessage({ type: 'error', text: data.message || 'Invalid or expired reset token' });
        setTokenValid(false);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to verify reset token' });
      setTokenValid(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const validatePassword = (password: string) => {
    setPasswordRequirements({
      length: password.length >= 10,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);
    validatePassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (!Object.values(passwordRequirements).every(req => req)) {
      setMessage({ type: 'error', text: 'Please meet all password requirements' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password reset successfully! Redirecting to login...' });
        setTimeout(() => {
          setLocation('/login');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to reset password' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reset password. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="shadow-2xl border-slate-200 dark:border-slate-700 w-full max-w-md">
          <CardContent className="pt-6 pb-6 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-slate-600 dark:text-slate-400">Verifying reset token...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center p-4">
        <Card className="shadow-2xl border-slate-200 dark:border-slate-700 w-full max-w-md">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-t-xl">
            <CardTitle className="text-2xl font-bold text-center">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
            <p className="text-slate-600 dark:text-slate-400 text-center">
              This password reset link is invalid or has expired.
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/forgot-password">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 min-h-[44px]" data-testid="button-request-new">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="w-full min-h-[44px]" data-testid="button-back-to-login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-slate-200 dark:border-slate-700">
          <CardHeader className="space-y-1 bg-gradient-to-r from-slate-700 to-blue-700 text-white rounded-t-xl">
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <CardDescription className="text-blue-100 text-center">
              Enter your new password
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {message && (
              <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500 bg-green-50 dark:bg-green-950' : ''}>
                {message.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription className={message.type === 'success' ? 'text-green-800 dark:text-green-100' : ''}>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={handlePasswordChange}
                    required
                    className="pl-10 min-h-[44px] touch-manipulation"
                    data-testid="input-new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pl-10 min-h-[44px] touch-manipulation"
                    data-testid="input-confirm-password"
                  />
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Password Requirements:</p>
                <ul className="space-y-1 text-sm">
                  <li className={`flex items-center gap-2 ${passwordRequirements.length ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordRequirements.length ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {passwordRequirements.length && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    At least 10 characters
                  </li>
                  <li className={`flex items-center gap-2 ${passwordRequirements.uppercase ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordRequirements.uppercase ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {passwordRequirements.uppercase && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    One uppercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${passwordRequirements.lowercase ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordRequirements.lowercase ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {passwordRequirements.lowercase && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    One lowercase letter
                  </li>
                  <li className={`flex items-center gap-2 ${passwordRequirements.number ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center ${passwordRequirements.number ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {passwordRequirements.number && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                    One number
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !Object.values(passwordRequirements).every(req => req)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all min-h-[44px] touch-manipulation"
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="w-full min-h-[44px] touch-manipulation hover:bg-slate-100 dark:hover:bg-slate-800"
                  data-testid="button-back-to-login-bottom"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} Queen City Elite LLC
        </p>
      </div>
    </div>
  );
}
