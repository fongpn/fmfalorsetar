import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from '@/App';

const router = createBrowserRouter([
  {
    path: '/*',
    element: <App />,
  }
], {
  future: {
    v7_relativeSplatPath: true
  }
});

export function Router() {
  return <RouterProvider router={router} />;
} 