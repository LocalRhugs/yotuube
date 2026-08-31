import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { exchangeYouTubeCode } from "@/lib/youtube-api";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const YouTubeCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [helpText, setHelpText] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`Authorization denied: ${error}`);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('No authorization code received');
      return;
    }

    const exchange = async () => {
      const redirectUri = `${window.location.origin}/youtube-callback`;
      const res = await exchangeYouTubeCode(code, redirectUri);
      if (res.success) {
        setStatus('success');
        setMessage(`Connected to: ${res.data?.channelTitle || 'YouTube Channel'}`);
        setTimeout(() => navigate('/settings'), 2000);
      } else {
        setStatus('error');
        // Provide actionable guidance based on the error
        const errMsg = res.error || 'Failed to connect YouTube account';
        setMessage(errMsg);
        if (errMsg.includes('invalid_client')) {
          setHelpText('Your Google Client ID or Secret is incorrect. Update them in your project secrets, ensuring they match your Google Cloud Console credentials.');
        } else if (errMsg.includes('redirect_uri_mismatch') || errMsg.includes('Redirect URI')) {
          setHelpText(`Add this exact URI to your Google Cloud Console → APIs & Services → Credentials → Authorized redirect URIs: ${window.location.origin}/youtube-callback`);
        } else if (errMsg.includes('invalid_grant')) {
          setHelpText('The authorization code expired. Try connecting again from Settings.');
        }
      }
    };

    exchange();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center space-y-4 max-w-md">
        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="font-medium text-foreground">Connecting YouTube account...</p>
            <p className="text-sm text-muted-foreground">Exchanging authorization code</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
            <p className="font-medium text-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirecting to settings...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="font-medium text-foreground">Connection Failed</p>
            <p className="text-sm text-muted-foreground">{message}</p>
            {helpText && (
              <div className="bg-muted rounded-lg p-3 text-left">
                <p className="text-xs font-medium text-foreground mb-1">💡 How to fix:</p>
                <p className="text-xs text-muted-foreground break-all">{helpText}</p>
              </div>
            )}
            <Button variant="outline" onClick={() => navigate('/settings')}>
              Back to Settings
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default YouTubeCallbackPage;
