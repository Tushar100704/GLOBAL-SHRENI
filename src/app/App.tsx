import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { MarketplaceProvider } from './state/marketplace-context';

export default function App() {
  return (
    <MarketplaceProvider>
      <RouterProvider router={router} />
      <Toaster />
    </MarketplaceProvider>
  );
}
