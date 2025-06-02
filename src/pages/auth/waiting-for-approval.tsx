import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { checkDeviceAuthorizationStatus, subscribeToDeviceStatus } from '@/lib/fingerprint';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading-spinner';

const WaitingForApprovalPage = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the request ID from location state
  const requestId = location.state?.requestId;

  useEffect(() => {
    if (!requestId || !user) {
      // If no request ID or user, redirect to login
      navigate('/login');
      return;
    }

    const checkStatus = async () => {
      try {
        const { status: deviceStatus } = await checkDeviceAuthorizationStatus(requestId);
        setStatus(deviceStatus);
        setIsLoading(false);
        
        // If already approved, redirect to dashboard
        if (deviceStatus === 'approved') {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking device status:', error);
        setIsLoading(false);
      }
    };

    checkStatus();

    // Subscribe to status changes
    const unsubscribe = subscribeToDeviceStatus(requestId, (newStatus) => {
      setStatus(newStatus);
      
      // If approved, redirect to dashboard
      if (newStatus === 'approved') {
        navigate('/');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [requestId, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
  };

  // Render the status screen
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
        <div className="flex justify-center">
          <ShieldCheck className="h-16 w-16 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Device Authorization
        </h2>
        
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400">
              Checking device status...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {status === 'pending' && (
              <>
                <div className="flex justify-center">
                  <Clock className="h-16 w-16 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Waiting for Approval</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your device needs to be authorized by an administrator.
                    Please wait or contact your system administrator.
                  </p>
                </div>
                
                <div className="animate-pulse flex justify-center">
                  <div className="h-2 w-2 bg-amber-500 rounded-full mx-1"></div>
                  <div className="h-2 w-2 bg-amber-500 rounded-full mx-1 animate-delay-200"></div>
                  <div className="h-2 w-2 bg-amber-500 rounded-full mx-1 animate-delay-400"></div>
                </div>
              </>
            )}
            
            {status === 'denied' && (
              <>
                <div className="flex justify-center">
                  <XCircle className="h-16 w-16 text-red-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Access Denied</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your device authorization request has been denied.
                    Please contact your system administrator for assistance.
                  </p>
                </div>
              </>
            )}
            
            {status === 'approved' && (
              <>
                <div className="flex justify-center">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium">Access Approved</p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your device has been authorized.
                    Redirecting to dashboard...
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              </>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="mt-6"
            >
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingForApprovalPage;