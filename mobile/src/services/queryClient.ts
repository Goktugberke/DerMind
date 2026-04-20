import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 dakika — bu süre içinde tekrar istek atmaz
      gcTime: 1000 * 60 * 10,   // 10 dakika — cache bellekten silinir
      retry: 1,
      retryDelay: 1000,
      refetchOnWindowFocus: false,  // Tab geçişinde gereksiz istek atma
      refetchOnReconnect: true,     // İnternet kesilip gelince yenile
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});
