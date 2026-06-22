'use client';

import { AuthProvider } from './context/AuthProvider';
import { EditModeProvider } from './context/EditModeProvider';
import { RevistasProvider } from './context/RevistasProvider';
import { VideosProvider } from './context/VideosProvider';
import { ArticulosProvider } from './context/ArticulosProvider';
import { IntegrantesProvider } from './context/IntegrantesProvider';
import { PurchasesProvider } from './context/PurchasesProvider';
import { CartProvider } from './context/CartProvider';
import { SiteSettingsProvider } from './context/SiteSettingsProvider';
import PageviewTracker from './components/PageviewTracker';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <EditModeProvider>
        <SiteSettingsProvider>
          <RevistasProvider>
            <VideosProvider>
              <ArticulosProvider>
                <IntegrantesProvider>
                  <PurchasesProvider>
                    <CartProvider>
                      <PageviewTracker />
                      {children}
                    </CartProvider>
                  </PurchasesProvider>
                </IntegrantesProvider>
              </ArticulosProvider>
            </VideosProvider>
          </RevistasProvider>
        </SiteSettingsProvider>
      </EditModeProvider>
    </AuthProvider>
  );
}
