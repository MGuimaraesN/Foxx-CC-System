import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTransactions, createTransaction, updateTransaction, deleteTransaction, fetchCards, fetchDashboardStats, createCard, updateCard } from '../services/transactionService';
import { Transaction } from '../types';

interface MutationOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const useTransactions = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
    retry: 1, // Don't retry too many times for this demo
    enabled: options?.enabled,
  });
};

export const useCreateTransaction = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTransaction,
    onMutate: async (newTx: any) => {
        await queryClient.cancelQueries({ queryKey: ['transactions'] });
        const previous = queryClient.getQueryData(['transactions']);
        queryClient.setQueryData(['transactions'], (old: any) => {
            return old ? [ { ...newTx, id: 'temp-' + Date.now(), status: newTx.status || 'PENDING' }, ...old ] : [];
        });
        return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error, newTx, context: any) => {
      if (context?.previous) {
          queryClient.setQueryData(['transactions'], context.previous);
      }
      if (options?.onError) options.onError(error);
    }
  });
};

export const useUpdateTransaction = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTransaction,
    onMutate: async (updatedTx: any) => {
        await queryClient.cancelQueries({ queryKey: ['transactions'] });
        const previous = queryClient.getQueryData(['transactions']);
        queryClient.setQueryData(['transactions'], (old: any) => {
             return old ? old.map((t: any) => t.id === updatedTx.id ? { ...t, ...updatedTx } : t) : [];
        });
        return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error, vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(['transactions'], context.previous);
      if (options?.onError) options.onError(error);
    }
  });
};

export const useDeleteTransaction = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTransaction,
    onMutate: async (id: string) => {
        await queryClient.cancelQueries({ queryKey: ['transactions'] });
        const previous = queryClient.getQueryData(['transactions']);
        queryClient.setQueryData(['transactions'], (old: any) => {
            return old ? old.filter((t: any) => t.id !== id) : [];
        });
        return { previous };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error, id, context: any) => {
      if (context?.previous) queryClient.setQueryData(['transactions'], context.previous);
      if (options?.onError) options.onError(error);
    }
  });
};

export const useCards = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['cards'],
    queryFn: fetchCards,
    enabled: options?.enabled,
  });
};

export const useCreateCard = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    }
  });
};

export const useUpdateCard = (options?: MutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      if (options?.onSuccess) options.onSuccess();
    },
    onError: (error) => {
      if (options?.onError) options.onError(error);
    }
  });
};

export const useDashboardStats = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    enabled: options?.enabled,
  });
};