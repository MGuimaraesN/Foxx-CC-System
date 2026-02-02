import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: string;
  spent: number;
  remaining: number;
  percentage: number;
}

export const fetchBudgets = async (): Promise<Budget[]> => {
  const response = await api.get('/budgets');
  return response.data;
};

export const useBudgets = () => {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
