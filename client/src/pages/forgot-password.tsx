import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setIdentifier("");
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to process request' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to process password reset request. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-slate-200 dark:border-slate-700">
          <CardHeader className="space-y-1 bg-gradient-to-r from-slate-700 to-blue-700 text-white rounded-t-xl">
            <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
            <CardDescription className="text-blue-100 text-center">
              Enter your email or username to reset your password
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
                <Label htmlFor="identifier" className="text-sm font-medium">
                  Email or Username
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="identifier"
                    type="text"
                    placeholder="Enter your email or username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="pl-10 min-h-[44px] touch-manipulation"
                    data-testid="input-identifier"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg hover:shadow-xl transition-all min-h-[44px] touch-manipulation"
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="w-full min-h-[44px] touch-manipulation hover:bg-slate-100 dark:hover:bg-slate-800"
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>

            <div className="text-center space-y-2 pt-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Remember your password?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Sign in
                </Link>
              </p>
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
